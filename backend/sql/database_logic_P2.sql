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

DELIMITER //

CREATE PROCEDURE AddShowtime(
    IN p_Start_Time DATETIME,
    IN p_Movie_ID INT,
    IN p_Room_ID INT
)
BEGIN
    DECLARE v_Duration INT;
    DECLARE v_End_Time DATETIME;
    DECLARE v_Conflict_Count INT;


    SELECT Duration INTO v_Duration 
    FROM MOVIE 
    WHERE Movie_ID = p_Movie_ID;

    IF v_Duration IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Error: Movie doesnt exist';
    END IF;


    SET v_End_Time = DATE_ADD(p_Start_Time, INTERVAL v_Duration MINUTE);

    
    SELECT COUNT(*) INTO v_Conflict_Count
    FROM SHOWTIME
    WHERE Room_ID = p_Room_ID
      AND (
          (p_Start_Time < End_Time AND v_End_Time > Start_Time)
      );

    IF v_Conflict_Count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Time slot not available';
    ELSE

        INSERT INTO SHOWTIME (Start_Time, End_Time, Movie_ID, Room_ID)
        VALUES (p_Start_Time, v_End_Time, p_Movie_ID, p_Room_ID);
        
        SELECT 'Showtime added successfully' AS Status, v_End_Time AS Calculated_End_Time;
    END IF;

END //

DELIMITER ;


DELIMITER //
CREATE PROCEDURE DeleteShowtime(IN p_Showtime_ID INT)
BEGIN
    DELETE FROM SHOWTIME WHERE Showtime_ID = p_Showtime_ID;
END//
DELIMITER ;


-- DELIMITER //

-- DROP TRIGGER IF EXISTS trg_BeforeInsertShowtime //

-- CREATE TRIGGER trg_BeforeInsertShowtime
-- BEFORE INSERT ON SHOWTIME
-- FOR EACH ROW
-- BEGIN
--     -- Kiểm tra nếu thời gian bắt đầu nhỏ hơn thời điểm hiện tại
--     IF NEW.Start_Time < CURRENT_TIMESTAMP THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Error: Cant add showtime has been timed out ';
--     END IF;
-- END //

-- DELIMITER ;

-- DELIMITER //

-- DROP TRIGGER IF EXISTS trg_CheckShowtimeGap //

-- CREATE TRIGGER trg_CheckShowtimeGap
-- BEFORE INSERT ON SHOWTIME
-- FOR EACH ROW
-- BEGIN
--     DECLARE v_last_end_time DATETIME;

--     -- 1. Tìm thời điểm kết thúc của suất chiếu gần nhất TRƯỚC suất chiếu đang định thêm
--     -- (Trong cùng một Room_ID)
--     SELECT MAX(End_Time) INTO v_last_end_time
--     FROM SHOWTIME
--     WHERE Room_ID = NEW.Room_ID
--       AND Start_Time <= NEW.Start_Time;

--     -- 2. Kiểm tra logic:
--     -- Nếu tìm thấy suất chiếu trước đó và khoảng cách không đủ 15 phút
--     IF v_last_end_time IS NOT NULL THEN
--         IF NEW.Start_Time < DATE_ADD(v_last_end_time, INTERVAL 15 MINUTE) THEN
--             SIGNAL SQLSTATE '45000'
--             SET MESSAGE_TEXT = 'Lỗi: Thời gian bắt đầu phải cách suất chiếu trước đó ít nhất 15 phút để dọn dẹp phòng!';
--         END IF;
--     END IF;
--     
--     -- 3. (Optional) Kiểm tra thêm nếu suất chiếu mới chèn vào giữa và đè lên suất chiếu SAU nó
--     IF EXISTS (
--         SELECT 1 FROM SHOWTIME 
--         WHERE Room_ID = NEW.Room_ID 
--           AND Start_Time >= NEW.Start_Time 
--           AND Start_Time < DATE_ADD(NEW.End_Time, INTERVAL 15 MINUTE)
--     ) THEN
--         SIGNAL SQLSTATE '45000'
--         SET MESSAGE_TEXT = 'Lỗi: Suất chiếu này đè lên thời gian chuẩn bị của suất chiếu tiếp theo!';
--     END IF;

-- END //

-- DELIMITER ;

DELIMITER //

CREATE PROCEDURE SafeDeleteMovie(
    IN p_Movie_ID INT
)
BEGIN
    DECLARE v_MovieExists INT;
    DECLARE v_FutureShowtimes INT;

    -- 1. Check if movie exists
    SELECT COUNT(*) INTO v_MovieExists 
    FROM MOVIE 
    WHERE Movie_ID = p_Movie_ID;

    -- 2. Check for future showtimes (comparing Start_Time to current system time)
    SELECT COUNT(*) INTO v_FutureShowtimes 
    FROM SHOWTIME 
    WHERE Movie_ID = p_Movie_ID AND Start_Time > CURRENT_TIMESTAMP;

    -- 3. Execution Logic
    IF v_MovieExists = 0 THEN
        SELECT 'Error: Movie ID does not exist.' AS Status_Message;
        
    ELSEIF v_FutureShowtimes > 0 THEN
        SELECT CONCAT('Warning: Cannot delete Movie ID ', p_Movie_ID, '. There are ', v_FutureShowtimes, ' upcoming showtimes scheduled.') AS Status_Message;
        
    ELSE
        -- Safe to delete
        DELETE FROM MOVIE WHERE Movie_ID = p_Movie_ID;
        SELECT CONCAT('Success: Movie ID ', p_Movie_ID, ' safely deleted (no future showtimes affected).') AS Status_Message;
    END IF;

END //

DELIMITER ;


DELIMITER //

CREATE PROCEDURE AddNewMovie(
    IN p_Title VARCHAR(255),
    IN p_Duration INT,
    IN p_Age_Restriction INT,
    IN p_Genre1 VARCHAR(50), 
    IN p_Genre2 VARCHAR(50)  -- Optional second genre
)
BEGIN
    DECLARE v_Movie_ID INT;

    -- If any error occurs, rollback the changes
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'Error: Failed to insert movie due to invalid data or constraints.' AS Error_Message;
    END;

    START TRANSACTION;

    -- 1. Insert the movie
    INSERT INTO MOVIE (Title, Duration, Age_Restriction)
    VALUES (p_Title, p_Duration, p_Age_Restriction);

    -- 2. Get the new Movie_ID
    SET v_Movie_ID = LAST_INSERT_ID();

    -- 3. Insert the first genre
    IF p_Genre1 IS NOT NULL THEN
        INSERT INTO MOVIE_GENRE (Movie_ID, Genre) VALUES (v_Movie_ID, p_Genre1);
    END IF;

    -- 4. Insert the second genre (if provided)
    IF p_Genre2 IS NOT NULL THEN
        INSERT INTO MOVIE_GENRE (Movie_ID, Genre) VALUES (v_Movie_ID, p_Genre2);
    END IF;

    COMMIT;
    SELECT 'Movie and genres added successfully!' AS Success_Message;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE DeleteMovie(
    IN p_Movie_ID INT
)
BEGIN
    DECLARE v_MovieExists INT;

    -- If any error occurs, rollback and return an error message
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT 'Error: Failed to delete the movie due to a database error.' AS Status_Message;
    END;

    -- Check if the movie actually exists in the database
    SELECT COUNT(*) INTO v_MovieExists 
    FROM MOVIE 
    WHERE Movie_ID = p_Movie_ID;

    IF v_MovieExists = 0 THEN
        SELECT 'Error: Movie ID does not exist.' AS Status_Message;
    ELSE
        START TRANSACTION;
        
        -- Delete the movie. 
        -- ON DELETE CASCADE handles MOVIE_GENRE, SHOWTIME, and TICKET automatically.
        DELETE FROM MOVIE 
        WHERE Movie_ID = p_Movie_ID;
        
        COMMIT;
        SELECT CONCAT('Success: Movie ID ', p_Movie_ID, ' and all its associated data have been deleted.') AS Status_Message;
    END IF;

END //

DELIMITER ;