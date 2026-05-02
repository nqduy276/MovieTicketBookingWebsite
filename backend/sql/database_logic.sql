USE CineBook;
-- Phần 1: Quản lý tài khoản user
DELIMITER $$
-- Kiểm tra email có tồn tại không
CREATE FUNCTION EmailExists(p_email VARCHAR(255))
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE cnt INT;

    SELECT COUNT(*) INTO cnt
    FROM CINEUSER
    WHERE Email = p_email;

    RETURN cnt > 0;
END $$

DELIMITER ;

DELIMITER $$
-- Thêm tài khoản khách hàng 
CREATE PROCEDURE CreateCustomer(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_dob DATE
)
BEGIN
    DECLARE new_user_id INT;

    -- Check email
    IF EmailExists(p_email) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Email already exists';
    END IF;

    -- Insert USER
    INSERT INTO CINEUSER(Email, Password, First_Name, Last_Name)
    VALUES(p_email, p_password, p_first_name, p_last_name);

    SET new_user_id = LAST_INSERT_ID();

    -- Insert CUSTOMER
    INSERT INTO CUSTOMER(User_ID, Date_of_Birth)
    VALUES(new_user_id, p_dob);

END $$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE CreateStaff(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_role VARCHAR(100),
    IN p_manager_id INT
)
BEGIN
    DECLARE new_user_id INT;

    IF EmailExists(p_email) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Email already exists';
    END IF;

    -- Insert USER
    INSERT INTO CINEUSER(Email, Password, First_Name, Last_Name)
    VALUES(p_email, p_password, p_first_name, p_last_name);

    SET new_user_id = LAST_INSERT_ID();

    -- Insert STAFF
    INSERT INTO STAFF(User_ID, Job_Role, Manager_ID)
    VALUES(new_user_id, p_role, p_manager_id);



END $$

DELIMITER ;

DELIMITER $$
-- Xóa User
CREATE PROCEDURE DeleteUser(
    IN p_email VARCHAR(255)
)
BEGIN
    -- Check tồn tại
    IF NOT EmailExists(p_email) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User not found';
    END IF;

    DELETE FROM CINEUSER WHERE Email = p_email;
END $$

DELIMITER ;

DELIMITER $$
-- Trigger thêm dữ liệu
CREATE TRIGGER BeforeInsertUser
BEFORE INSERT ON CINEUSER
FOR EACH ROW
BEGIN
    -- Chuẩn hoá email (lowercase)
    SET NEW.Email = LOWER(NEW.Email);

    -- Trim khoảng trắng
    SET NEW.First_Name = TRIM(NEW.First_Name);
    SET NEW.Last_Name = TRIM(NEW.Last_Name);

    -- Check password tối thiểu 6 ký tự
    IF LENGTH(NEW.Password) < 6 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Password must be at least 6 characters';
    END IF;
END $$

DELIMITER ;

DELIMITER $$
-- Trigger kiểm tra trước khi xóa
CREATE TRIGGER BeforeDeleteUser
BEFORE DELETE ON CINEUSER
FOR EACH ROW
BEGIN
    -- Ví dụ: không cho xoá admin (nếu có rule)
    IF OLD.Email = 'admin@gmail.com' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete admin account';
    END IF;
END $$

DELIMITER ;

DELIMITER $$
-- Kiểm tra đăng nhập
CREATE PROCEDURE LoginUser(
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_password VARCHAR(255);

    SELECT User_ID, Password INTO v_user_id, v_password
    FROM CINEUSER
    WHERE Email = p_email;

    IF v_user_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User not found';
    END IF;

    IF v_password <> p_password THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Incorrect password';
    END IF;

    SELECT v_user_id AS User_ID;

END $$

DELIMITER ;

DELIMITER $$
-- Thêm số điện thoại 
CREATE PROCEDURE AddPhoneByEmail(
    IN p_email VARCHAR(255), 
    IN p_phone VARCHAR(15)
)
BEGIN
    DECLARE v_user_id INT;

    -- Lấy User_ID từ email
    SELECT User_ID INTO v_user_id
    FROM CINEUSER
    WHERE Email = p_email;

    -- Check user tồn tại
    IF v_user_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User not found';
    END IF;

    -- Insert phone
    INSERT INTO USER_PHONE(User_ID, Phone_Number)
    VALUES (v_user_id, p_phone);

END $$

DELIMITER ;

DELIMITER $$

CREATE FUNCTION GetUserIdByEmail(p_Email VARCHAR(255)) 
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_User_ID INT;
    
    -- Lấy User_ID dựa trên Email
    SELECT User_ID INTO v_User_ID
    FROM CINEUSER
    WHERE Email = p_Email
    LIMIT 1;
    
    RETURN v_User_ID;
END $$

DELIMITER ;