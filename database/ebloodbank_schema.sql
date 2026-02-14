-- Database Initialization Script

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Drop and Recreate Database
DROP DATABASE IF EXISTS ebloodbank;
CREATE DATABASE ebloodbank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ebloodbank;

-- 2. Drop Tables 
DROP TABLE IF EXISTS medical_reports;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS org_members;
DROP TABLE IF EXISTS donor_verifications;
DROP TABLE IF EXISTS emergency_requests;
DROP TABLE IF EXISTS blood_inventory;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS admins;

DROP TABLE IF EXISTS donors;

-- 3. Create Tables

-- Donors Table
CREATE TABLE donors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NULL UNIQUE,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NULL,
  google_id VARCHAR(255) UNIQUE DEFAULT NULL,
  blood_type VARCHAR(50),
  dob DATE,
  availability ENUM('Available','Unavailable') DEFAULT 'Available',
  phone VARCHAR(50) DEFAULT NULL,
  gender ENUM('male','female','other') DEFAULT NULL,
  country VARCHAR(100) DEFAULT 'India',
  state VARCHAR(100) DEFAULT NULL,
  district VARCHAR(100) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  profile_picture TEXT DEFAULT NULL,
  reset_code VARCHAR(10) DEFAULT NULL,
  reset_code_expires_at DATETIME DEFAULT NULL,
  donor_tag VARCHAR(20) UNIQUE DEFAULT NULL,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  total_donations INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blood_type (blood_type),
  INDEX idx_location (city, district)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) UNIQUE DEFAULT NULL,
  type ENUM('Hospital', 'Blood Bank', 'Clinic') NOT NULL,
  address TEXT,
  state VARCHAR(100),
  district VARCHAR(100),
  city VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  reset_code VARCHAR(10) DEFAULT NULL,
  reset_code_expires_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_org_city (city),
  INDEX idx_org_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donations Table (Past Donations)
CREATE TABLE donations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  org_id INT DEFAULT NULL,
  date DATE,
  units DECIMAL(5,2) DEFAULT 1.00,
  hb_level DECIMAL(4,2) NULL,
  blood_pressure VARCHAR(20) NULL,
  notes TEXT,
  INDEX idx_donations_donor (donor_id),
  INDEX idx_donations_org (org_id),
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admins Table
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('Active', 'Disabled') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blood Inventory (Organization Specific)
CREATE TABLE blood_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  blood_group VARCHAR(30) NOT NULL,
  units INT DEFAULT 0,
  min_threshold INT DEFAULT 5,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_inventory (org_id, blood_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Emergency Requests
CREATE TABLE emergency_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  blood_group VARCHAR(30) NOT NULL,
  units_required INT NOT NULL,
  urgency_level ENUM('Critical', 'High', 'Medium') DEFAULT 'High',
  description TEXT,
  status ENUM('Active', 'Fulfilled', 'Cancelled') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donor Verifications
CREATE TABLE donor_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  donor_id INT NOT NULL,
  verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Verified', 'Rejected') DEFAULT 'Verified',
  notes TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Organization Members
CREATE TABLE org_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  donor_id INT NOT NULL,
  role ENUM('Member', 'Volunteer') DEFAULT 'Member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member (org_id, donor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  recipient_type ENUM('Donor', 'Organization') NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source_id INT DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_recipient (recipient_id, recipient_type, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Broadcasts (Global)
CREATE TABLE broadcasts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target ENUM('all', 'donors', 'organizations') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Medical Reports
CREATE TABLE medical_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  org_id INT NOT NULL,
  hb_level DECIMAL(4,2),
  blood_pressure VARCHAR(20),
  pulse_rate INT,
  temperature DECIMAL(4,1),
  weight DECIMAL(5,2),
  units_donated DECIMAL(5,2) DEFAULT 1.00,
  blood_group VARCHAR(50),
  rh_factor ENUM('Positive', 'Negative'),
  hiv_status ENUM('Negative', 'Positive') DEFAULT 'Negative',
  hepatitis_b ENUM('Negative', 'Positive') DEFAULT 'Negative',
  hepatitis_c ENUM('Negative', 'Positive') DEFAULT 'Negative',
  syphilis ENUM('Negative', 'Positive') DEFAULT 'Negative',
  malaria ENUM('Negative', 'Positive') DEFAULT 'Negative',
  test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Organization Activity Logs
CREATE TABLE org_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  org_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_org_logs_org_id (org_id),
  INDEX idx_org_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Donor Activity Logs
CREATE TABLE donor_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  INDEX idx_donor_logs_donor_id (donor_id),
  INDEX idx_donor_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Match Outcomes (Historical Data for AI/ML)
CREATE TABLE match_outcomes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  seeker_id INT NULL, 
  suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  outcome ENUM('Pending', 'Accepted', 'Rejected', 'Completed', 'TimedOut') DEFAULT 'Pending',
  response_time_seconds INT DEFAULT NULL,
  suitability_score DECIMAL(5,2) DEFAULT NULL,
  distance_km DECIMAL(10,2) DEFAULT NULL,
  FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
  INDEX idx_match_donor (donor_id),
  INDEX idx_match_outcome (outcome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Admin Activity Logs
CREATE TABLE admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX idx_admin_logs_admin_id (admin_id),
  INDEX idx_admin_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


INSERT INTO admins (username, password_hash)
VALUES ('admin','$2b$10$s/wNd/VHlfpK4pHMKqC7XehD2sev7CLaGPJkmpP52agx8JcAbJbXi');

-- =========================
-- SEED ORGANIZATIONS
-- =========================
INSERT INTO organizations
(name, email, phone, password_hash, license_number, type, address, state, district, city, verified)
VALUES
('Caritas Hospital', 'info@caritashospital.org', '04822260000', NULL, 'LIC-KTM-001', 'Hospital', 'Thellakom PO', 'Kerala', 'Kottayam', 'Thellakom', TRUE),
('Government Medical College Kottayam', 'gmckottayam@kerala.gov.in', '04812562000', NULL, 'LIC-KTM-002', 'Hospital', 'Gandhinagar', 'Kerala', 'Kottayam', 'Gandhinagar', TRUE),
('Lourdes Hospital', 'contact@lourdeskottayam.com', '04812300000', NULL, 'LIC-KTM-003', 'Hospital', 'Collectorate PO', 'Kerala', 'Kottayam', 'Kottayam', TRUE),
('SH Medical Centre', 'admin@shmedical.org', '04812420000', NULL, 'LIC-KTM-004', 'Hospital', 'Changanassery', 'Kerala', 'Kottayam', 'Changanassery', TRUE),
('Marian Medical Centre', 'info@marianmedicalcentre.com', '04822270000', NULL, 'LIC-KTM-005', 'Hospital', 'Pala', 'Kerala', 'Kottayam', 'Pala', TRUE);

-- =========================
-- SET ORGANIZATION PASSWORD = 12345678
-- =========================
UPDATE organizations
SET password_hash = '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS';

INSERT INTO organizations (name, email, password_hash, type, state, district, city, phone, latitude, longitude) VALUES
('Amrita Institute of Medical Sciences', 'aims.kochi@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Ernakulam', 'Kochi', '04842851234', 9.9312, 76.2673),
('Aster Medcity', 'medcity.kochi@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Ernakulam', 'Cheranalloor', '04846623000', 10.0436, 76.2755),
('Rajagiri Hospital', 'info@rajagirihospital.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Ernakulam', 'Aluva', '04842905000', 10.0984, 76.3688),
('Government Medical College, Trivandrum', 'mct.tvm@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Thiruvananthapuram', 'Thiruvananthapuram', '04712528300', 8.5241, 76.9366),
('Caritas Hospital', 'caritas@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Kottayam', 'Thellakom', '04812790025', 9.6375, 76.5412),
('Jubilee Mission Medical College', 'jubilee@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Thrissur', 'Thrissur', '04872432200', 10.5276, 76.2144),
('Baby Memorial Hospital', 'bmh@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Kozhikode', 'Kozhikode', '04952723272', 11.2588, 75.7804),
('Lourdes Hospital', 'lourdes@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Ernakulam', 'Kochi', '04842393720', 9.9926, 76.2801),
('Pushpagiri Medical College', 'pushpagiri@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Pathanamthitta', 'Thiruvalla', '04692700755', 9.3878, 76.5746),
('St. Gregorious Hospital', 'stgregorious@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'Hospital', 'Kerala', 'Pathanamthitta', 'Parumala', '04692312266', 9.3400, 76.5400);


-- =========================
-- SEED DONORS
-- =========================
INSERT INTO donors
(username, full_name, email, password_hash, blood_type, dob, availability, phone, gender, state, district, city, donor_tag)
VALUES
('jmathew', 'Joseph Mathew', 'joseph.mathew@gmail.com', NULL, 'A+', '1996-04-12', 'Available', '9876543210', 'male', 'Kerala', 'Kottayam', 'Pala', 'DON-000001'),
('tgeorge', 'Thomas George', 'thomas.george@gmail.com', NULL, 'O+', '1994-08-20', 'Available', '9876543211', 'male', 'Kerala', 'Kottayam', 'Ettumanoor', 'DON-000002'),
('amary', 'Annie Mary', 'annie.mary@gmail.com', NULL, 'B+', '1998-01-05', 'Unavailable', '9876543212', 'female', 'Kerala', 'Kottayam', 'Changanassery', 'DON-000003'),
('pjohn', 'Paul John', 'paul.john@gmail.com', NULL, 'AB+', '1992-06-18', 'Available', '9876543213', 'male', 'Kerala', 'Kottayam', 'Kanjirappally', 'DON-000004'),
('rthomas', 'Riya Thomas', 'riya.thomas@gmail.com', NULL, 'O-', '1999-11-09', 'Available', '9876543214', 'female', 'Kerala', 'Kottayam', 'Vaikom', 'DON-000005'),
('sjoseph', 'Samuel Joseph', 'samuel.j@gmail.com', NULL, 'A-', '1995-03-22', 'Unavailable', '9876543215', 'male', 'Kerala', 'Kottayam', 'Pampady', 'DON-000006'),
('lmathew', 'Linda Mathew', 'linda.mathew@gmail.com', NULL, 'B-', '2000-07-14', 'Available', '9876543216', 'female', 'Kerala', 'Kottayam', 'Kuravilangad', 'DON-000007'),
('ajames', 'Alex James', 'alex.james@gmail.com', NULL, 'AB-', '1993-12-01', 'Available', '9876543217', 'male', 'Kerala', 'Kottayam', 'Pala', 'DON-000008'),
('mgeorge', 'Maria George', 'maria.george@gmail.com', NULL, 'A+', '1997-09-27', 'Available', '9876543218', 'female', 'Kerala', 'Kottayam', 'Changanassery', 'DON-000009'),
('vpaul', 'Vincent Paul', 'vincent.paul@gmail.com', NULL, 'O+', '1991-02-10', 'Unavailable', '9876543219', 'male', 'Kerala', 'Kottayam', 'Ettumanoor', 'DON-000010');

-- =========================
-- SET DONOR PASSWORD = 12345678
-- =========================
UPDATE donors
SET password_hash = '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS';


INSERT INTO donors (username, full_name, email, password_hash, blood_type, dob, gender, state, district, city, phone, latitude, longitude, availability, total_donations) VALUES
('varghese_k', 'Varghese Kuruvilla', 'varghese.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1985-05-12', 'male', 'Kerala', 'Ernakulam', 'Kochi', '9447000001', 9.9312, 76.2673, 'Available', 5),
('mariamma_j', 'Mariamma Joseph', 'mariamma.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1990-08-20', 'female', 'Kerala', 'Kottayam', 'Kanjirappally', '9447000002', 9.5558, 76.7914, 'Available', 3),
('mathew_p', 'Mathew Philip', 'mathew.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1988-11-05', 'male', 'Kerala', 'Idukki', 'Thodupuzha', '9447000003', 9.8959, 76.7116, 'Available', 8),
('annie_t', 'Annie Thomas', 'annie.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB+', '1995-03-15', 'female', 'Kerala', 'Pathanamthitta', 'Thiruvalla', '9447000004', 9.3878, 76.5746, 'Available', 2),
('chacko_c', 'Chacko Cherian', 'chacko.c@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1982-12-25', 'male', 'Kerala', 'Alappuzha', 'Chengannur', '9447000005', 9.3300, 76.6100, 'Available', 12),
('shaji_v', 'Shaji Varghese', 'shaji.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A-', '1978-06-30', 'male', 'Kerala', 'Kollam', 'Kottarakkara', '9447000006', 8.9986, 76.7717, 'Available', 4),
('elizabeth_k', 'Elizabeth Kurian', 'elizabeth.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1992-01-10', 'female', 'Kerala', 'Thrissur', 'Thrissur', '9447000007', 10.5276, 76.2144, 'Available', 1),
('george_m', 'George Mathai', 'george.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1980-04-22', 'male', 'Kerala', 'Kottayam', 'Kottayam', '9447000008', 9.5916, 76.5221, 'Available', 6),
('baby_m', 'Baby Mundakkal', 'baby.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1+', '1984-09-18', 'male', 'Kerala', 'Ernakulam', 'Muvattupuzha', '9447000009', 9.9880, 76.5794, 'Available', 2),
('reji_p', 'Reji Punnose', 'reji.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1987-02-14', 'male', 'Kerala', 'Idukki', 'Kattappana', '9447000010', 9.7161, 77.0863, 'Available', 5),
('shiny_a', 'Shiny Abraham', 'shiny.a@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB-', '1993-12-05', 'female', 'Kerala', 'Ernakulam', 'Angamaly', '9447000011', 10.1983, 76.3860, 'Available', 3),
('sunny_s', 'Sunny Sebastian', 'sunny.s@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1986-07-07', 'male', 'Kerala', 'Thrissur', 'Chalakudy', '9447000012', 10.3117, 76.3332, 'Available', 10),
('priya_m', 'Priya Mathew', 'priya.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1994-05-25', 'female', 'Kerala', 'Kottayam', 'Pala', '9447000013', 9.7042, 76.6853, 'Available', 2),
('jojo_c', 'Jojo Chacko', 'jojo.c@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1989-10-10', 'male', 'Kerala', 'Kozhikode', 'Kozhikode', '9447000014', 11.2588, 75.7804, 'Available', 4),
('treesa_g', 'Treesa George', 'treesa.g@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1991-03-22', 'female', 'Kerala', 'Wayanad', 'Mananthavady', '9447000015', 11.8021, 76.0245, 'Available', 1),
('benny_k', 'Benny Kurian', 'benny.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1983-08-11', 'male', 'Kerala', 'Malappuram', 'Malappuram', '9447000016', 11.0510, 76.0711, 'Available', 7),
('elsamma_j', 'Elsamma Jacob', 'elsamma.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1975-01-30', 'female', 'Kerala', 'Pathanamthitta', 'Ranni', '9447000017', 9.3846, 76.7876, 'Available', 9),
('peter_a', 'Peter Alexander', 'peter.a@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1988-06-18', 'male', 'Kerala', 'Alappuzha', 'Haripad', '9447000018', 9.2900, 76.4500, 'Available', 3),
('alice_v', 'Alice Varghese', 'alice.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1992-04-05', 'female', 'Kerala', 'Ernakulam', 'Perumbavoor', '9447000019', 10.1100, 76.4800, 'Available', 2),
('thomas_i', 'Thomas Isaac', 'thomas.i@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB+', '1981-02-28', 'male', 'Kerala', 'Thiruvananthapuram', 'Neyyattinkara', '9447000020', 8.4000, 77.0800, 'Available', 11);

INSERT INTO donors (username, full_name, email, password_hash, blood_type, dob, gender, state, district, city, phone, latitude, longitude, availability, total_donations) VALUES
('kurian_p', 'Kurian Pallath', 'kurian.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1986-05-15', 'male', 'Kerala', 'Kottayam', 'Kottayam', '9447000021', 9.5916, 76.5221, 'Available', 4),
('molly_j', 'Molly John', 'molly.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1979-11-20', 'female', 'Kerala', 'Ernakulam', 'Kochi', '9447000022', 9.9312, 76.2673, 'Available', 6),
('shaji_m', 'Shaji Mathew', 'shaji.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1984-03-10', 'male', 'Kerala', 'Thrissur', 'Irinjalakuda', '9447000023', 10.3396, 76.2081, 'Available', 14),
('gracy_t', 'Gracy Thomas', 'gracy.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1991-07-12', 'female', 'Kerala', 'Kottayam', 'Changanassery', '9447000024', 9.4447, 76.5390, 'Available', 2),
('punnose_v', 'Punnose Varghese', 'punnose.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1982-01-01', 'male', 'Kerala', 'Pathanamthitta', 'Pathanamthitta', '9447000025', 9.2648, 76.7870, 'Available', 5),
('mini_a', 'Mini Abraham', 'mini.a@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1995-12-30', 'female', 'Kerala', 'Idukki', 'Adimali', '9447000026', 10.0135, 76.9535, 'Available', 1),
('jacob_k', 'Jacob Kurian', 'jacob.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1980-05-04', 'male', 'Kerala', 'Kottayam', 'Kanjirappally', '9447000027', 9.5558, 76.7914, 'Available', 7),
('mercy_p', 'Mercy Philip', 'mercy.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB+', '1988-10-15', 'female', 'Kerala', 'Alappuzha', 'Kayamkulam', '9447000028', 9.1720, 76.5000, 'Available', 3),
('stephen_c', 'Stephen Chacko', 'stephen.c@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1993-02-22', 'male', 'Kerala', 'Kozhikode', 'Vadakara', '9447000029', 11.6033, 75.5908, 'Available', 2),
('sini_v', 'Sini Varghese', 'sini.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1987-08-08', 'female', 'Kerala', 'Ernakulam', 'Tripunithura', '9447000030', 9.9514, 76.3400, 'Available', 5),
('antony_j', 'Antony Joseph', 'antony.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1981-11-11', 'male', 'Kerala', 'Kottayam', 'Ettumanoor', '9447000031', 9.6700, 76.5600, 'Available', 8),
('anitha_t', 'Anitha Thomas', 'anitha.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1994-04-04', 'female', 'Kerala', 'Ernakulam', 'Kochi', '9447000032', 9.9312, 76.2673, 'Available', 2),
('sebastian_p', 'Sebastian Peter', 'sebastian.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1985-09-09', 'male', 'Kerala', 'Idukki', 'Munnar', '9447000033', 10.0889, 77.0595, 'Available', 6),
('rose_m', 'Rose Mathew', 'rose.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1B+', '1990-01-01', 'female', 'Kerala', 'Thrissur', 'Kunnamkulam', '9447000034', 10.6400, 76.0800, 'Available', 3),
('reji_k', 'Reji Kuruvilla', 'reji.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1982-12-12', 'male', 'Kerala', 'Pathanamthitta', 'Adoor', '9447000035', 9.1555, 76.7300, 'Available', 10),
('gracy_v', 'Gracy Varghese', 'gracy.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1977-03-31', 'female', 'Kerala', 'Kottayam', 'Kanjirappally', '9447000036', 9.5558, 76.7914, 'Available', 15),
('baby_t', 'Baby Thomas', 'baby.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1984-06-06', 'male', 'Kerala', 'Ernakulam', 'Paravur', '9447000037', 10.1500, 76.2200, 'Available', 4),
('molly_p', 'Molly Philip', 'molly.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A-', '1991-11-11', 'female', 'Kerala', 'Thrissur', 'Irinjalakuda', '9447000038', 10.3396, 76.2081, 'Available', 2),
('shaji_a', 'Shaji Abraham', 'shaji.a@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1986-09-09', 'male', 'Kerala', 'Pathanamthitta', 'Thiruvalla', '9447000039', 9.3878, 76.5746, 'Available', 3),
('elizabeth_m', 'Elizabeth Mathew', 'elizabeth.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1992-02-22', 'female', 'Kerala', 'Alappuzha', 'Chengannur', '9447000040', 9.3300, 76.6100, 'Available', 1),
('scaria_j', 'Scaria Jacob', 'scaria.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1B+', '1980-03-12', 'male', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000051', 9.4623, 76.8152, 'Available', 6),
('joyce_m', 'Joyce Muttathu', 'joyce.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1992-11-20', 'female', 'Kerala', 'Kottayam', 'Koovapally', '9447000052', 9.4975, 76.8402, 'Available', 2),
('antony_p', 'Antony Parackal', 'antony.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1985-06-05', 'male', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000053', 9.4623, 76.8152, 'Available', 4),
('treesamma_v', 'Treesamma Varghese', 'treesamma.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A-', '1976-09-18', 'female', 'Kerala', 'Kottayam', 'Koovapally', '9447000054', 9.4975, 76.8402, 'Available', 8),
('jaison_k', 'Jaison Kaduppil', 'jaison.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB-', '1988-12-25', 'male', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000055', 9.4623, 76.8152, 'Available', 3),
('mary_j', 'Mary Joseph', 'mary.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1994-01-15', 'female', 'Kerala', 'Kottayam', 'Koovapally', '9447000056', 9.4975, 76.8402, 'Available', 2),
('sabu_t', 'Sabu Thomas', 'sabu.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1982-05-10', 'male', 'Kerala', 'Idukki', 'Adimali', '9447000057', 10.0135, 76.9535, 'Available', 7),
('laly_j', 'Laly Joseph', 'laly.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1989-10-30', 'female', 'Kerala', 'Wayanad', 'Kalpetta', '9447000058', 11.6103, 76.0828, 'Available', 4),
('binoy_p', 'Binoy Philip', 'binoy.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB+', '1984-02-14', 'male', 'Kerala', 'Kasaragod', 'Kanhangad', '9447000059', 12.3167, 75.0833, 'Available', 5),
('shiny_s', 'Shiny Sunny', 'shiny.s@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1+', '1995-07-07', 'female', 'Kerala', 'Kannur', 'Thalassery', '9447000060', 11.7491, 75.4890, 'Available', 1),
('jomon_m', 'Jomon Mathew', 'jomon.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1987-04-20', 'male', 'Kerala', 'Palakkad', 'Ottapalam', '9447000061', 10.7749, 76.3314, 'Available', 6),
('shanti_a', 'Shanti Abraham', 'shanti.a@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1991-08-12', 'female', 'Kerala', 'Thrissur', 'Irinjalakuda', '9447000062', 10.3396, 76.2081, 'Available', 3),
('vinu_v', 'Vinu Varghese', 'vinu.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1983-01-30', 'male', 'Kerala', 'Ernakulam', 'Angamaly', '9447000063', 10.1983, 76.3860, 'Available', 9),
('mercy_k', 'Mercy Kurian', 'mercy.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1986-11-11', 'female', 'Kerala', 'Kottayam', 'Pala', '9447000064', 9.7100, 76.6800, 'Available', 4),
('reji_m', 'Reji Mathai', 'reji.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1981-05-15', 'male', 'Kerala', 'Pathanamthitta', 'Adoor', '9447000065', 9.1555, 76.7300, 'Available', 11),
('annie_j', 'Annie Joseph', 'annie.j2@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB-', '1993-09-09', 'female', 'Kerala', 'Kollam', 'Punalur', '9447000066', 9.0117, 76.9262, 'Available', 2),
('chacko_m', 'Chacko Mathai', 'chacko.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1979-12-25', 'male', 'Kerala', 'Ernakulam', 'Muvattupuzha', '9447000067', 9.9880, 76.5794, 'Available', 5),
('molly_t', 'Molly Thomas', 'molly.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1B+', '1990-06-18', 'female', 'Kerala', 'Thrissur', 'Chalakudy', '9447000068', 10.3117, 76.3332, 'Available', 3),
('stephen_k', 'Stephen Kuruvilla', 'stephen.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1985-02-28', 'male', 'Kerala', 'Kottayam', 'Kanjirappally', '9447000069', 9.5558, 76.7914, 'Available', 7),
('priya_c', 'Priya Chacko', 'priya.c@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1994-04-05', 'female', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000070', 9.4623, 76.8152, 'Available', 2),
('jojo_p', 'Jojo Paul', 'jojo.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A-', '1982-10-10', 'male', 'Kerala', 'Kottayam', 'Koovapally', '9447000071', 9.4975, 76.8402, 'Available', 4),
('shiny_v', 'Shiny Varghese', 'shiny.v2@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1991-03-22', 'female', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000072', 9.4623, 76.8152, 'Available', 1),
('benny_j', 'Benny Jacob', 'benny.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1984-08-11', 'male', 'Kerala', 'Kottayam', 'Koovapally', '9447000073', 9.4975, 76.8402, 'Available', 10),
('gracy_m', 'Gracy Mathew', 'gracy.m2@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB+', '1975-01-01', 'female', 'Kerala', 'Idukki', 'Munnar', '9447000074', 10.0889, 77.0595, 'Available', 12),
('sunny_p', 'Sunny Philip', 'sunny.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1+', '1986-05-12', 'male', 'Kerala', 'Kozhikode', 'Vatakara', '9447000075', 11.6033, 75.5908, 'Available', 3),
('mini_k', 'Mini Kurian', 'mini.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1990-08-20', 'female', 'Kerala', 'Ernakulam', 'Perumbavoor', '9447000076', 10.1100, 76.4800, 'Available', 0),
('sebastian_v', 'Sebastian Varghese', 'sebastian.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1988-11-05', 'male', 'Kerala', 'Alappuzha', 'Harippad', '9447000077', 9.2900, 76.4500, 'Available', 5),
('rose_j', 'Rose Jacob', 'rose.j2@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A-', '1995-03-15', 'female', 'Kerala', 'Thrissur', 'Irinjalakuda', '9447000078', 10.3396, 76.2081, 'Available', 2),
('punnose_m', 'Punnose Mathew', 'punnose.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1982-12-25', 'male', 'Kerala', 'Kottayam', 'Koovapally', '9447000079', 9.4975, 76.8402, 'Available', 8),
('molly_v', 'Molly Varghese', 'molly.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB-', '1978-06-30', 'female', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000080', 9.4623, 76.8152, 'Available', 4),
('shaji_k', 'Shaji Kuruvilla', 'shaji.k@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B-', '1992-01-10', 'male', 'Kerala', 'Kollam', 'Kottarakkara', '9447000081', 8.9986, 76.7717, 'Available', 1),
('elizabeth_p', 'Elizabeth Philip', 'elizabeth.p2@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1980-04-22', 'female', 'Kerala', 'Idukki', 'Thodupuzha', '9447000082', 9.8959, 76.7116, 'Available', 6),
('baby_c', 'Baby Chacko', 'baby.c@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A1+', '1984-09-18', 'male', 'Kerala', 'Ernakulam', 'Muvattupuzha', '9447000083', 9.9880, 76.5794, 'Available', 2),
('reji_j', 'Reji Jacob', 'reji.j@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1987-02-14', 'male', 'Kerala', 'Kottayam', 'Koovapally', '9447000084', 9.4975, 76.8402, 'Available', 5),
('shiny_t', 'Shiny Thomas', 'shiny.t@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'AB-', '1993-12-05', 'female', 'Kerala', 'Pathanamthitta', 'Chunkappara', '9447000085', 9.4623, 76.8152, 'Available', 3),
('sunny_v', 'Sunny Varghese', 'sunny.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O+', '1986-07-07', 'male', 'Kerala', 'Thrissur', 'Chalakudy', '9447000086', 10.3117, 76.3332, 'Available', 10),
('priya_k', 'Priya Kurian', 'priya.k2@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1994-05-25', 'female', 'Kerala', 'Kottayam', 'Pala', '9447000087', 9.7100, 76.6800, 'Available', 2),
('jojo_m', 'Jojo Mathew', 'jojo.m@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'A+', '1989-10-10', 'male', 'Kerala', 'Kozhikode', 'Kozhikode', '9447000088', 11.2588, 75.7804, 'Available', 4),
('treesa_p', 'Treesa Philip', 'treesa.p@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'O-', '1991-03-22', 'female', 'Kerala', 'Wayanad', 'Mananthavady', '9447000089', 11.8021, 76.0245, 'Available', 1),
('benny_v', 'Benny Varghese', 'benny.v@example.com', '$2b$10$Rb4ZJwP4Qah906tg.b58Tudr5XxMcWhhTopFdmyCl5PbfAsrMAaSS', 'B+', '1983-08-11', 'male', 'Kerala', 'Malappuram', 'Malappuram', '9447000090', 11.0510, 76.0711, 'Available', 7);

SET FOREIGN_KEY_CHECKS = 1;

-- END OF SCRIPT
