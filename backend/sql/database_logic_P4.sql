USE Cinebook;


DELIMITER //

-- ==========================================
-- FUNCTION 1: TÍNH ĐIỂM LOYALTY
-- ==========================================
DROP FUNCTION IF EXISTS Calc_Loyalty_Points_For_Booking //

CREATE FUNCTION Calc_Loyalty_Points_For_Booking(p_Booking_ID INT) 
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_Total_Points INT DEFAULT 0;
    DECLARE v_User_ID INT;
    DECLARE v_Is_Staff INT DEFAULT 0;
    DECLARE v_Item_Type VARCHAR(10);
    DECLARE v_Price DECIMAL(10,2);
    DECLARE v_Qty INT;
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_items CURSOR FOR
        SELECT 'TICKET' AS Item_Type, s.Price, 1 AS Quantity
        FROM TICKET t 
        JOIN SEAT s ON t.Room_ID = s.Room_ID AND t.Seat_No = s.Seat_No
        WHERE t.Booking_ID = p_Booking_ID
        UNION ALL
        SELECT 'FANDB' AS Item_Type, f.Price, bf.Quantity
        FROM BOOKING_FANDB bf 
        JOIN FANDB_ITEM f ON bf.Item_ID = f.Item_ID
        WHERE bf.Booking_ID = p_Booking_ID;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SELECT COUNT(*) INTO v_Exists FROM BOOKING WHERE Booking_ID = p_Booking_ID;
    IF v_Exists = 0 THEN RETURN -1; END IF;
    
    SELECT User_ID INTO v_User_ID FROM BOOKING WHERE Booking_ID = p_Booking_ID;
    
    -- Constraint #8: Staff không tích điểm 
    SELECT COUNT(*) INTO v_Is_Staff FROM STAFF WHERE User_ID = v_User_ID;
    IF v_Is_Staff > 0 THEN RETURN 0; END IF;
    
    OPEN cur_items;
    item_loop: LOOP
        FETCH cur_items INTO v_Item_Type, v_Price, v_Qty;
        IF done THEN LEAVE item_loop; END IF;
        
        IF v_Item_Type = 'TICKET' THEN
            SET v_Total_Points = v_Total_Points + CAST((v_Price * v_Qty * 0.5 / 1000) AS SIGNED);
        ELSEIF v_Item_Type = 'FANDB' THEN
            SET v_Total_Points = v_Total_Points + CAST((v_Price * v_Qty * 1 / 1000) AS SIGNED);
        END IF;
    END LOOP;
    CLOSE cur_items;
    
    RETURN v_Total_Points;
END //

-- ==========================================
-- FUNCTION 2: TÍNH GIẢM GIÁ HỢP LỆ
-- ==========================================
DROP FUNCTION IF EXISTS Calculate_Valid_Discount //

CREATE FUNCTION Calculate_Valid_Discount(p_Booking_ID INT) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_Total_Discount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_Base_Amount DECIMAL(10,2) DEFAULT 0;
    DECLARE v_Ticket_Total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_FandB_Total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_Discount_Value DECIMAL(10,2);
    DECLARE v_Expiration_Date DATE;
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_promos CURSOR FOR
        SELECT p.Discount_Value, p.Expiration_Date
        FROM BOOKING_PROMO bp
        JOIN PROMOTION p ON bp.Code = p.Code
        WHERE bp.Booking_ID = p_Booking_ID;
        
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SELECT COUNT(*) INTO v_Exists FROM BOOKING WHERE Booking_ID = p_Booking_ID;
    IF v_Exists = 0 THEN RETURN -1; END IF;
    
    SELECT IFNULL(SUM(s.Price), 0) INTO v_Ticket_Total
    FROM TICKET t JOIN SEAT s ON t.Room_ID = s.Room_ID AND t.Seat_No = s.Seat_No
    WHERE t.Booking_ID = p_Booking_ID;
    
    SELECT IFNULL(SUM(f.Price * bf.Quantity), 0) INTO v_FandB_Total
    FROM BOOKING_FANDB bf JOIN FANDB_ITEM f ON bf.Item_ID = f.Item_ID
    WHERE bf.Booking_ID = p_Booking_ID;
    
    SET v_Base_Amount = v_Ticket_Total + v_FandB_Total;
    IF v_Base_Amount = 0 THEN RETURN 0; END IF;
    
    OPEN cur_promos;
    promo_loop: LOOP
        FETCH cur_promos INTO v_Discount_Value, v_Expiration_Date;
        IF done THEN LEAVE promo_loop; END IF;
        
        -- Kiểm tra hạn dùng mã khuyến mãi 
        IF v_Expiration_Date >= CURDATE() THEN
            -- Constraint #3: Kiểm tra % hay tiền mặt 
            IF v_Discount_Value <= 100 THEN
                SET v_Total_Discount = v_Total_Discount + (v_Base_Amount * (v_Discount_Value / 100));
            ELSE
                SET v_Total_Discount = v_Total_Discount + v_Discount_Value;
            END IF;
        END IF;
    END LOOP;
    CLOSE cur_promos;
    
    -- Constraint #3: Tổng giảm không vượt quá tiền gốc
    IF v_Total_Discount > v_Base_Amount THEN
        SET v_Total_Discount = v_Base_Amount;
    END IF;
    
    RETURN v_Total_Discount;
END //

-- Trả về Delimiter mặc định ở cuối cùng
DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS MakeBooking //

CREATE PROCEDURE MakeBooking(
    IN p_User_ID INT,
    IN p_Showtime_ID INT,
    IN p_Seats JSON,          -- '["A1", "A2"]'
    IN p_FandB JSON,          -- '[{"id": 1, "qty": 2}]'
    IN p_Promo_Code VARCHAR(50)
)
BEGIN
    DECLARE v_Booking_ID INT;
    DECLARE v_Room_ID INT;
    DECLARE v_Total_Amount DECIMAL(10,2) DEFAULT 0;
    
    DECLARE i INT DEFAULT 0;
    DECLARE v_Temp_Price DECIMAL(10,2);
    DECLARE v_Temp_ID INT;
    DECLARE v_Temp_Qty INT;
    DECLARE v_Temp_Seat VARCHAR(10);
    
    DECLARE v_Count INT;
    DECLARE v_Earned_Points INT DEFAULT 0;

    -- Xử lý lỗi hệ thống
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Lấy Room_ID
    SELECT Room_ID INTO v_Room_ID FROM SHOWTIME WHERE Showtime_ID = p_Showtime_ID;
    IF v_Room_ID IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Suất chiếu không tồn tại!';
    END IF;

    -- ==========================================
    -- BƯỚC 1: TÍNH TOÁN TỔNG GIÁ TRỊ (BEFORE INSERT)
    -- ==========================================

    -- Cộng tiền ghế
    IF p_Seats IS NOT NULL AND JSON_LENGTH(p_Seats) > 0 THEN
        SET i = 0;
        WHILE i < JSON_LENGTH(p_Seats) DO
            SET v_Temp_Seat = JSON_UNQUOTE(JSON_EXTRACT(p_Seats, CONCAT('$[', i, ']')));
            SELECT Price INTO v_Temp_Price FROM SEAT WHERE Room_ID = v_Room_ID AND Seat_No = v_Temp_Seat;
            
            IF v_Temp_Price IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Ghế không tồn tại trong phòng chiếu!';
            END IF;
            
            SET v_Total_Amount = v_Total_Amount + v_Temp_Price;
            SET i = i + 1;
        END WHILE;
    END IF;

    -- Cộng tiền F&B
    IF p_FandB IS NOT NULL AND JSON_LENGTH(p_FandB) > 0 THEN
        SET i = 0;
        WHILE i < JSON_LENGTH(p_FandB) DO
            SET v_Temp_ID = JSON_EXTRACT(p_FandB, CONCAT('$[', i, '].id'));
            SET v_Temp_Qty = JSON_EXTRACT(p_FandB, CONCAT('$[', i, '].qty'));
            
            SELECT Price INTO v_Temp_Price FROM FANDB_ITEM WHERE Item_ID = v_Temp_ID;
            
            IF v_Temp_Price IS NOT NULL THEN
                SET v_Total_Amount = v_Total_Amount + (v_Temp_Price * v_Temp_Qty);
            END IF;
            SET i = i + 1;
        END WHILE;
    END IF;

    -- ==========================================
    -- BƯỚC 2: INSERT VÀO BẢNG CHÍNH (BOOKING)
    -- ==========================================
    -- Lúc này Total_Amount đã có giá trị cuối cùng (trước promo)
    INSERT INTO BOOKING (User_ID, Total_Amount) VALUES (p_User_ID, v_Total_Amount);
    SET v_Booking_ID = LAST_INSERT_ID();

    -- ==========================================
    -- BƯỚC 3: INSERT VÀO CÁC BẢNG CHI TIẾT
    -- ==========================================

    -- Insert TICKET
    IF p_Seats IS NOT NULL AND JSON_LENGTH(p_Seats) > 0 THEN
        SET i = 0;
        WHILE i < JSON_LENGTH(p_Seats) DO
            SET v_Temp_Seat = JSON_UNQUOTE(JSON_EXTRACT(p_Seats, CONCAT('$[', i, ']')));
            INSERT INTO TICKET (Booking_ID, Showtime_ID, Room_ID, Seat_No) 
            VALUES (v_Booking_ID, p_Showtime_ID, v_Room_ID, v_Temp_Seat);
            SET i = i + 1;
        END WHILE;
    END IF;

    -- Insert BOOKING_FANDB
    IF p_FandB IS NOT NULL AND JSON_LENGTH(p_FandB) > 0 THEN
        SET i = 0;
        WHILE i < JSON_LENGTH(p_FandB) DO
            SET v_Temp_ID = JSON_EXTRACT(p_FandB, CONCAT('$[', i, '].id'));
            SET v_Temp_Qty = JSON_EXTRACT(p_FandB, CONCAT('$[', i, '].qty'));
            INSERT INTO BOOKING_FANDB (Booking_ID, Item_ID, Quantity) 
            VALUES (v_Booking_ID, v_Temp_ID, v_Temp_Qty);
            SET i = i + 1;
        END WHILE;
    END IF;

    -- Lưu mã Promo (nếu có)
    IF p_Promo_Code IS NOT NULL AND p_Promo_Code != '' THEN
        INSERT INTO BOOKING_PROMO (Booking_ID, Code) VALUES (v_Booking_ID, p_Promo_Code);
    END IF;

    -- ==========================================
    -- BƯỚC 4: TÍCH ĐIỂM (LOYALTY)
    -- ==========================================
    SELECT COUNT(*) INTO v_Count FROM CUSTOMER WHERE User_ID = p_User_ID;
    IF v_Count > 0 THEN
        -- Hàm Calc_Loyalty_Points_For_Booking sẽ đọc dữ liệu từ TICKET/FANDB vừa insert
        SET v_Earned_Points = Calc_Loyalty_Points_For_Booking(v_Booking_ID);
        IF v_Earned_Points > 0 THEN
            UPDATE CUSTOMER SET Loyalty_Points = Loyalty_Points + v_Earned_Points WHERE User_ID = p_User_ID;
        END IF;
    END IF;

    COMMIT;

    -- Trả về thông tin tóm tắt
    SELECT 
        v_Booking_ID AS Booking_ID, 
        v_Total_Amount AS Final_Total, 
        v_Earned_Points AS Points_Added;

END //

DELIMITER ;