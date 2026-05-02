USE CineBook;
DELIMITER $$
CREATE PROCEDURE GetTheatersByMovieAndDate(
    IN p_MovieName VARCHAR(255),
    IN p_ShowDate DATE
)
BEGIN
    SELECT DISTINCT 
        tc.Complex_ID, 
        tc.Name AS Complex_Name, 
        tc.Street, 
        tc.District, 
        tc.City
    FROM THEATER_COMPLEX tc
    JOIN AUDITORIUM au ON tc.Complex_ID = au.Complex_ID
    JOIN SHOWTIME st ON au.Room_ID = st.Room_ID
    JOIN MOVIE m ON st.Movie_ID = m.Movie_ID
    WHERE m.Title LIKE CONCAT('%', p_MovieName, '%') -- Tìm kiếm tương đối tên phim
      AND DATE(st.Start_Time) = p_ShowDate;          -- Cắt lấy phần ngày để so sánh
END $$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE GetShowtimesByMovieTheaterAndDate(
    IN p_MovieName VARCHAR(255),
    IN p_ComplexName VARCHAR(255),
    IN p_ShowDate DATE
)
BEGIN
    SELECT 
        m.Title AS Movie_Title,
        tc.Name AS Theater_Name,
        au.Room_Name,
        au.Screen_Type,
        TIME(st.Start_Time) AS Start_Time,
        TIME(st.End_Time) AS End_Time
    FROM THEATER_COMPLEX tc
    JOIN AUDITORIUM au ON tc.Complex_ID = au.Complex_ID
    JOIN SHOWTIME st ON au.Room_ID = st.Room_ID
    JOIN MOVIE m ON st.Movie_ID = m.Movie_ID
    WHERE m.Title LIKE CONCAT('%', p_MovieName, '%') 
      AND tc.Name LIKE CONCAT('%', p_ComplexName, '%') 
      AND DATE(st.Start_Time) = p_ShowDate
      -- ĐIỀU KIỆN QUAN TRỌNG: Chỉ lấy những suất chiếu mà thời gian bắt đầu vẫn còn ở tương lai
      AND st.Start_Time > CURRENT_TIMESTAMP
    ORDER BY st.Start_Time ASC;
END $$

DELIMITER ;


DELIMITER //

DROP PROCEDURE IF EXISTS GetBookedSeats //
-- Lấy các chỗ trống đã hết để bôi đen ghế đã được chọn trên UI 
CREATE PROCEDURE GetBookedSeats(
    IN p_Showtime_ID INT
)
BEGIN
    SELECT 
        t.Seat_No, 
        s.Seat_Type, 
        s.Price,
        t.Booking_ID
    FROM TICKET t
    JOIN SEAT s ON t.Room_ID = s.Room_ID AND t.Seat_No = s.Seat_No
    WHERE t.Showtime_ID = p_Showtime_ID; -- Lọc ra các ghế ĐÃ CÓ trong bảng TICKET
END //

DELIMITER ;

DELIMITER //

DROP PROCEDURE IF EXISTS GetAvailableSeats //
-- Lấy các chỗ trống vẫn còn để không bôi đen trên UI 
CREATE PROCEDURE GetAvailableSeats(
    IN p_Showtime_ID INT
)
BEGIN
    SELECT 
        s.Seat_No, 
        s.Seat_Type, 
        s.Price
    FROM SHOWTIME st
    JOIN SEAT s ON st.Room_ID = s.Room_ID
    LEFT JOIN TICKET t ON st.Showtime_ID = t.Showtime_ID 
                       AND s.Room_ID = t.Room_ID 
                       AND s.Seat_No = t.Seat_No
    WHERE st.Showtime_ID = p_Showtime_ID 
      AND t.Seat_No IS NULL; -- Lọc ra các ghế KHÔNG có trong bảng TICKET
END //

DELIMITER ;