USE CineBook;
DELIMITER //

DROP PROCEDURE IF EXISTS PromotionTrade //

CREATE PROCEDURE PromotionTrade(
    IN p_User_ID INT,
    IN p_Prom_ID INT
)
BEGIN
    DECLARE v_User_Points INT;
    DECLARE v_Promo_Price INT;

    -- 1. Lấy điểm hiện tại của khách
    SELECT Loyalty_Points INTO v_User_Points 
    FROM CUSTOMER 
    WHERE User_ID = p_User_ID;

    -- 2. Lấy giá điểm của Promotion
    SELECT Price INTO v_Promo_Price 
    FROM PROMOTION 
    WHERE Promotion_ID = p_Prom_ID;

    -- 3. Kiểm tra logic
    IF v_User_Points IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Không tìm thấy thông tin khách hàng!';
    ELSEIF v_Promo_Price IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Promotion không tồn tại!';
    ELSEIF v_User_Points < v_Promo_Price THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bạn không đủ Loyalty Point để đổi mã này!';
    ELSE
        -- 4. Trừ điểm
        UPDATE CUSTOMER 
        SET Loyalty_Points = Loyalty_Points - v_Promo_Price 
        WHERE User_ID = p_User_ID;
        
        -- Trả về thông báo thành công cho Backend
        SELECT 'Success' AS Status, v_Promo_Price AS Points_Deducted;
    END IF;
END //

DELIMITER //

DROP PROCEDURE IF EXISTS PromotionWalletInsert //

CREATE PROCEDURE PromotionWalletInsert(
    IN p_Code VARCHAR(50),
    IN p_User_ID INT,
    IN p_Prom_ID INT
)
BEGIN
    -- 1. Kiểm tra xem mã Code này đã tồn tại trong hệ thống chưa (tránh trùng mã)
    IF EXISTS (SELECT 1 FROM PROMOTION_WALLET WHERE Code = p_Code) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Mã Code này đã tồn tại trong ví!';
    
    -- 2. Kiểm tra xem Promotion_ID có hợp lệ không (đề phòng Backend gửi ID sai)
    ELSEIF NOT EXISTS (SELECT 1 FROM PROMOTION WHERE Promotion_ID = p_Prom_ID) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lỗi: Loại Promotion không tồn tại!';
        
    ELSE
        -- 3. Thực hiện chèn dữ liệu vào ví
        -- Vì bảng đã chuẩn hóa, ta chỉ cần lưu 3 thông tin định danh này
        INSERT INTO PROMOTION_WALLET (Code, Promotion_ID, Owner_ID)
        VALUES (p_Code, p_Prom_ID, p_User_ID);
        
        SELECT 'Mã đã được thêm vào ví của khách hàng thành công!' AS Message;
    END IF;
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS ViewAvailablePromo //

CREATE PROCEDURE ViewAvailablePromo(
    IN p_User_ID INT
)
BEGIN
    SELECT 
        pw.Code,
        p.Promotion_Name,
        -- Xử lý hiển thị loại giảm giá (VND hoặc %)
        CASE 
            WHEN p.Discount_Value > 100 THEN CONCAT(FORMAT(p.Discount_Value, 0), ' VND')
            ELSE CONCAT(p.Discount_Value, ' %')
        END AS Discount_Display,
        p.Expiration_Date
    FROM PROMOTION_WALLET pw
    -- JOIN với bảng gốc để lấy thông tin chi tiết
    JOIN PROMOTION p ON pw.Promotion_ID = p.Promotion_ID
    WHERE pw.Owner_ID = p_User_ID
      -- 1. Loại bỏ mã đã dùng
      AND NOT EXISTS (
          SELECT 1 
          FROM BOOKING_PROMO bp 
          WHERE bp.Code = pw.Code
      )
      -- 2. Chỉ lấy mã còn hạn
      AND p.Expiration_Date >= CURDATE()
    ORDER BY p.Expiration_Date ASC;
END //

DELIMITER ;