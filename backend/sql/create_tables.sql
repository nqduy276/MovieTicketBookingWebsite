-- Tạo Database (Nếu chưa có)
CREATE DATABASE IF NOT EXISTS CineBook;
USE CineBook;

-- ==========================================
-- 1. USER & ACCESS MANAGEMENT CLUSTER
-- ==========================================

CREATE TABLE CINEUSER (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    First_Name VARCHAR(100) NOT NULL,
    Last_Name VARCHAR(100) NOT NULL,
    Registration_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Ràng buộc định dạng Email cơ bản (có chứa ký tự @)
    CONSTRAINT CHK_User_Email CHECK (Email LIKE '%_@__%.__%')
);

CREATE TABLE USER_PHONE (
    User_ID INT,
    Phone_Number VARCHAR(15),
    PRIMARY KEY (User_ID, Phone_Number),
    FOREIGN KEY (User_ID) REFERENCES CINEUSER(User_ID) ON DELETE CASCADE
);

CREATE TABLE CUSTOMER (
    User_ID INT PRIMARY KEY,
    Date_of_Birth DATE NOT NULL,
    Loyalty_Points INT DEFAULT 0,
    FOREIGN KEY (User_ID) REFERENCES CINEUSER(User_ID) ON DELETE CASCADE,
    CONSTRAINT CHK_Customer_Points CHECK (Loyalty_Points >= 0)
);

CREATE TABLE STAFF (
    User_ID INT PRIMARY KEY,
    Job_Role ENUM('Manager','Staff') NOT NULL,
    Manager_ID INT NULL, -- NULL vì Giám đốc cao nhất có thể không có Manager
    FOREIGN KEY (User_ID) REFERENCES CINEUSER(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Manager_ID) REFERENCES STAFF(User_ID) ON DELETE SET NULL
);

-- ==========================================
-- 2. THEATER COMPLEX & FACILITIES CLUSTER
-- ==========================================

CREATE TABLE THEATER_COMPLEX (
    Complex_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Street VARCHAR(255) NOT NULL,
    District VARCHAR(100) NOT NULL,
    City VARCHAR(100) NOT NULL,
    Manager_ID INT UNIQUE, -- UNIQUE để đảm bảo quan hệ 1:1 (Một nhân viên chỉ quản lý tối đa 1 rạp)
    FOREIGN KEY (Manager_ID) REFERENCES STAFF(User_ID) ON DELETE SET NULL
);

CREATE TABLE AUDITORIUM (
    Room_ID INT AUTO_INCREMENT PRIMARY KEY,
    Room_Name VARCHAR(100) NOT NULL,
    Screen_Type ENUM('2D', 'IMAX', '3D') NOT NULL, -- vd: 'Standard', 'IMAX', 'Sweetbox'
    Complex_ID INT NOT NULL,
    FOREIGN KEY (Complex_ID) REFERENCES THEATER_COMPLEX(Complex_ID) ON DELETE CASCADE
);

-- SEAT là Weak Entity, phụ thuộc vào AUDITORIUM
CREATE TABLE SEAT (
    Room_ID INT,
    Seat_No VARCHAR(10), -- vd: 'A1', 'H9'
    Seat_Type ENUM('Standard', 'VIP', 'Sweetbox')  NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (Room_ID, Seat_No),
    FOREIGN KEY (Room_ID) REFERENCES AUDITORIUM(Room_ID) ON DELETE CASCADE,
    CONSTRAINT CHK_Seat_Price CHECK (Price >= 0),
    CONSTRAINT CHK_Seat_Format CHECK (Seat_No REGEXP '^[A-Z][0-9]+$')
);

-- ==========================================
-- 3. MOVIE CATALOG & SCHEDULING CLUSTER
-- ==========================================

CREATE TABLE MOVIE (
    Movie_ID INT AUTO_INCREMENT PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Duration INT NOT NULL, -- Tính bằng phút
    Age_Restriction INT NOT NULL,
    CONSTRAINT CHK_Movie_Duration CHECK (Duration > 0),
    CONSTRAINT CHK_Movie_Age CHECK (Age_Restriction >= 0)
);

CREATE TABLE MOVIE_GENRE (
    Movie_ID INT,
    Genre ENUM('Action','Comedy','Thriller','Romance'),
    PRIMARY KEY (Movie_ID, Genre),
    FOREIGN KEY (Movie_ID) REFERENCES MOVIE(Movie_ID) ON DELETE CASCADE
);

CREATE TABLE SHOWTIME (
    Showtime_ID INT AUTO_INCREMENT PRIMARY KEY,
    Start_Time DATETIME NOT NULL,
    End_Time DATETIME NOT NULL,
    Movie_ID INT NOT NULL,
    Room_ID INT NOT NULL,
    FOREIGN KEY (Movie_ID) REFERENCES MOVIE(Movie_ID) ON DELETE CASCADE,
    FOREIGN KEY (Room_ID) REFERENCES AUDITORIUM(Room_ID) ON DELETE CASCADE,
    -- Semantic Constraint: Giờ kết thúc phải lớn hơn giờ bắt đầu
    CONSTRAINT CHK_Showtime_Time CHECK (End_Time > Start_Time)
);

-- ==========================================
-- 4. BOOKINGS, TRANSACTIONS, & PROMOTIONS
-- ==========================================

CREATE TABLE BOOKING (
    Booking_ID INT AUTO_INCREMENT PRIMARY KEY,
    Booking_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Total_Amount DECIMAL(10,2) DEFAULT 0,
    User_ID INT NOT NULL,
    FOREIGN KEY (User_ID) REFERENCES CINEUSER(User_ID) ON DELETE CASCADE,
    CONSTRAINT CHK_Booking_Total CHECK (Total_Amount >= 0)
);

-- Quan hệ Ternary (Ba ngôi) kết nối Booking, Showtime, và Seat
CREATE TABLE TICKET (
    Booking_ID INT,
    Showtime_ID INT,
    Room_ID INT,
    Seat_No VARCHAR(10),
    PRIMARY KEY (Booking_ID, Showtime_ID, Room_ID, Seat_No),
    FOREIGN KEY (Booking_ID) REFERENCES BOOKING(Booking_ID) ON DELETE CASCADE,
    FOREIGN KEY (Showtime_ID) REFERENCES SHOWTIME(Showtime_ID) ON DELETE CASCADE,
    FOREIGN KEY (Room_ID, Seat_No) REFERENCES SEAT(Room_ID, Seat_No) ON DELETE CASCADE
);

CREATE TABLE FANDB_ITEM (
    Item_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    Category VARCHAR(100) NOT NULL,
    CONSTRAINT CHK_Fandb_Price CHECK (Price >= 0)
);

CREATE TABLE BOOKING_FANDB (
    Booking_ID INT,
    Item_ID INT,
    Quantity INT NOT NULL,
    PRIMARY KEY (Booking_ID, Item_ID),
    FOREIGN KEY (Booking_ID) REFERENCES BOOKING(Booking_ID) ON DELETE CASCADE,
    FOREIGN KEY (Item_ID) REFERENCES FANDB_ITEM(Item_ID) ON DELETE CASCADE,
    CONSTRAINT CHK_Fandb_Quantity CHECK (Quantity > 0)
);

CREATE TABLE PROMOTION (
	Promotion_ID INT AUTO_INCREMENT PRIMARY KEY,
    -- Code VARCHAR(50) PRIMARY KEY,
    Promotion_Name VARCHAR(255) NOT NULL,
    Price INT,
    Discount_Value DECIMAL(10,2) NOT NULL,
    Expiration_Date DATE NOT NULL,
    CONSTRAINT CHK_Promo_Discount CHECK (Discount_Value >= 0)
);

CREATE TABLE PROMOTION_WALLET (
    Code VARCHAR(50) PRIMARY KEY,
    Promotion_ID INT NOT NULL, 
    Owner_ID INT NOT NULL,
    FOREIGN KEY (Promotion_ID) REFERENCES PROMOTION(Promotion_ID) ON DELETE CASCADE,
    FOREIGN KEY (Owner_ID) REFERENCES CINEUSER(User_ID) ON DELETE CASCADE
);

CREATE TABLE BOOKING_PROMO (
    Booking_ID INT,
    Code VARCHAR(50),
    PRIMARY KEY (Booking_ID, Code),
    FOREIGN KEY (Booking_ID) REFERENCES BOOKING(Booking_ID) ON DELETE CASCADE,
    FOREIGN KEY (Code) REFERENCES PROMOTION_WALLET(Code) ON DELETE CASCADE
);

-- ==========================================
-- 				TEST MOCK DATA
-- ==========================================
-- INSERT INTO USER (Email, Password, First_Name, Last_Name)
-- VALUES 
-- ('chip@gmail.com', '123', 'DiepAnh', 'Nguyen'),
-- ('duy@gmail.com', '123', 'QuocDuy', 'Nguyen');

-- INSERT INTO CUSTOMER (User_ID, Date_of_Birth, Loyalty_Points)
-- VALUES 
-- (1, '2003-01-01', 100),
-- (2, '2005-06-17', 50);

-- INSERT INTO MOVIE (Title, Duration, Age_Restriction)
-- VALUES
-- ('Avengers', 120, 13),
-- ('Inception', 148, 16);

-- INSERT INTO THEATER_COMPLEX (Name, Street, District, City)
-- VALUES
-- ('CGV Vincom', 'Le Thanh Ton', 'District 1', 'HCM');

-- INSERT INTO AUDITORIUM (Room_Name, Screen_Type, Complex_ID)
-- VALUES
-- ('Room 1', 'Standard', 1);

-- INSERT INTO SEAT (Room_ID, Seat_No, Seat_Type, Price)
-- VALUES
-- (1, 'A1', 'Normal', 50000),
-- (1, 'A2', 'Normal', 50000);

-- INSERT INTO SHOWTIME (Start_Time, End_Time, Movie_ID, Room_ID)
-- VALUES
-- ('2026-05-01 18:00:00', '2026-05-01 20:00:00', 1, 1);

-- INSERT INTO BOOKING (User_ID, Total_Amount)
-- VALUES
-- (1, 100000);

-- INSERT INTO TICKET (Booking_ID, Showtime_ID, Room_ID, Seat_No)
-- VALUES
-- (1, 1, 1, 'A1



