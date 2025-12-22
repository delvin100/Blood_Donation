<?php
session_start();

// require DB
require_once __DIR__ . '/db.php';

if (!isset($_SESSION['donor_id'])) {
    header('Location: donor_login.php');
    exit;
}

$donorId = (int)$_SESSION['donor_id'];

// Function to automatically update donor availability based on donations
function updateDonorAvailability($pdo, $donorId) {
    // Get the most recent donation
    $stmt = $pdo->prepare('SELECT date FROM donations WHERE donor_id = ? ORDER BY date DESC LIMIT 1');
    $stmt->execute([$donorId]);
    $lastDonation = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($lastDonation) {
        $lastDate = new DateTime($lastDonation['date']);
        $now = new DateTime();
        $daysSinceLastDonation = $now->diff($lastDate)->days;
        
        // If less than 90 days since last donation, set to Unavailable
        // If 90 days or more, set to Available
        $availability = ($daysSinceLastDonation < 90) ? 'Unavailable' : 'Available';
        
        $updateStmt = $pdo->prepare('UPDATE donors SET availability = ? WHERE id = ?');
        $updateStmt->execute([$availability, $donorId]);
        
        error_log("Auto-updated donor $donorId availability to $availability (days since last donation: $daysSinceLastDonation)");
        
        return $availability;
    } else {
        // No donations, should be Available
        $updateStmt = $pdo->prepare('UPDATE donors SET availability = ? WHERE id = ?');
        $updateStmt->execute(['Available', $donorId]);
        
        error_log("Auto-updated donor $donorId availability to Available (no donations found)");
        
        return 'Available';
    }
}

// Auto-update availability on page load
updateDonorAvailability($pdo, $donorId);

// fetch donor (after availability update)
$stmt = $pdo->prepare('SELECT * FROM donors WHERE id = ? LIMIT 1');
$stmt->execute([$donorId]);
$me = $stmt->fetch(PDO::FETCH_ASSOC);
// Check for mandatory details (gender and 10-digit phone)
$showMandatoryPopup = false;
if (!isset($me['gender']) || empty($me['gender']) || !preg_match('/^[0-9]{10}$/', $me['phone'])) {
    $showMandatoryPopup = true;
}

if (!$me) {
    // invalid session
    session_unset();
    session_destroy();
    header('Location: donor_login.php');
    exit;
}

// Handle profile picture upload
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'upload_profile_picture') {
    if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['profile_picture']['tmp_name'];
        $fileName = $_FILES['profile_picture']['name'];
        $fileSize = $_FILES['profile_picture']['size'];
        $fileType = $_FILES['profile_picture']['type'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        // Only allow jpg, jpeg, png
        $allowedfileExtensions = ['jpg', 'jpeg', 'png'];
        $allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        
        if (in_array($fileExtension, $allowedfileExtensions) && in_array($fileType, $allowedMimeTypes)) {
            // Check file size (5MB max)
            if ($fileSize <= 5 * 1024 * 1024) {
                // Delete old profile picture if exists
                if (!empty($me['profile_picture']) && file_exists(__DIR__ . '/' . $me['profile_picture'])) {
                    unlink(__DIR__ . '/' . $me['profile_picture']);
                }
                
                $newFileName = 'profile_' . $donorId . '_' . time() . '.' . $fileExtension;
                $uploadFileDir = __DIR__ . '/uploads/profile_pictures/';
                if (!is_dir($uploadFileDir)) {
                    mkdir($uploadFileDir, 0755, true);
                }
                $dest_path = $uploadFileDir . $newFileName;

                if (move_uploaded_file($fileTmpPath, $dest_path)) {
                    // Update database with profile picture path
                    $upd = $pdo->prepare('UPDATE donors SET profile_picture = ? WHERE id = ?');
                    $upd->execute(['uploads/profile_pictures/' . $newFileName, $donorId]);
                    $_SESSION['message'] = 'Profile picture updated successfully!';
                    // Refresh $me to get updated profile picture path
                    $stmt->execute([$donorId]);
                    $me = $stmt->fetch(PDO::FETCH_ASSOC);
                } else {
                    $_SESSION['message'] = 'Error uploading the file. Please try again.';
                }
            } else {
                $_SESSION['message'] = 'File size too large. Maximum size is 5MB.';
            }
        } else {
            $_SESSION['message'] = 'Invalid file type. Only JPG, JPEG, and PNG files are allowed.';
        }
    } else {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'File too large (server limit)',
            UPLOAD_ERR_FORM_SIZE => 'File too large (form limit)',
            UPLOAD_ERR_PARTIAL => 'File upload incomplete',
            UPLOAD_ERR_NO_FILE => 'No file selected',
            UPLOAD_ERR_NO_TMP_DIR => 'No temporary directory',
            UPLOAD_ERR_CANT_WRITE => 'Cannot write to disk',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
        ];
        $error = $_FILES['profile_picture']['error'] ?? UPLOAD_ERR_NO_FILE;
        $_SESSION['message'] = $uploadErrors[$error] ?? 'Upload error occurred.';
    }
    header('Location: donor_dashboard.php');
    exit;
}

// Handle profile picture removal
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'remove_profile_picture') {
    if (!empty($me['profile_picture']) && file_exists(__DIR__ . '/' . $me['profile_picture'])) {
        unlink(__DIR__ . '/' . $me['profile_picture']);
    }
    
    // Update database to remove profile picture path
    $upd = $pdo->prepare('UPDATE donors SET profile_picture = NULL WHERE id = ?');
    $upd->execute([$donorId]);
    $_SESSION['message'] = 'Profile picture removed successfully.';
    
    // Refresh $me to get updated data
    $stmt->execute([$donorId]);
    $me = $stmt->fetch(PDO::FETCH_ASSOC);
    
    header('Location: donor_dashboard.php');
    exit;
}

$action = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? $_POST['action'] : '';
    if ($action === 'toggle_availability') {
        // Availability is now automatically managed based on donations
        // Users cannot manually change availability
        $_SESSION['message'] = 'Availability is automatically managed based on your donation history. You cannot change it manually.';
        header('Location: donor_dashboard.php');
        exit;
    } elseif ($action === 'update_profile') {
        $name = htmlspecialchars(trim($_POST['name'] ?? $me['full_name']), ENT_QUOTES, 'UTF-8');
        $phone = htmlspecialchars(trim($_POST['phone'] ?? $me['phone']), ENT_QUOTES, 'UTF-8');
        $dob = htmlspecialchars(trim($_POST['dob'] ?? $me['dob']), ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars(trim($_POST['email'] ?? $me['email']), ENT_QUOTES, 'UTF-8');
        $blood_type = htmlspecialchars(trim($_POST['blood_type'] ?? $me['blood_type']), ENT_QUOTES, 'UTF-8');
        $password = $_POST['password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';

        try {
            // Validate password if provided
            if (!empty($password)) {
                if ($password !== $confirm_password) {
                    throw new Exception('Password and Confirm Password do not match.');
                }
                if (strlen($password) < 6) {
                    throw new Exception('Password must be at least 6 characters long.');
                }
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
            } else {
                $password_hash = $me['password_hash'];
            }

            $upd = $pdo->prepare('UPDATE donors SET full_name = ?, phone = ?, dob = ?, email = ?, password_hash = ?, blood_type = ?, availability = ? WHERE id = ?');
            if (!$upd) {
                throw new Exception('Prepare failed: ' . implode(' ', $pdo->errorInfo()));
            }
            $result = $upd->execute([$name, $phone, $dob, $email, $password_hash, $blood_type, $availability, $donorId]);
            if (!$result) {
                throw new Exception('Execute failed: ' . implode(' ', $pdo->errorInfo()));
            }
            $_SESSION['message'] = 'Profile updated.';
        } catch (Exception $e) {
            $_SESSION['message'] = 'Error updating profile: ' . $e->getMessage();
        }
                } elseif ($action === 'update_mandatory_details') {
            $gender = $_POST['gender'] ?? '';
            $phone = $_POST['phone'] ?? '';

            // Server-side validation
            if (in_array($gender, ['Male', 'Female', 'Other']) && preg_match('/^[0-9]{10}$/', $phone)) {
                try {
                    $upd = $pdo->prepare('UPDATE donors SET gender = ?, phone = ? WHERE id = ?');
                    $upd->execute([$gender, $phone, $donorId]);
                    $_SESSION['message'] = 'Details updated successfully. Welcome!';
                    // Refresh the page to hide the modal
                    header('Location: donor_dashboard.php');
                    exit;
                } catch (Exception $e) {
                    // This will be shown inside the modal
                    $modal_error = 'Database error. Please try again.';
                }
            } else {
                // This will be shown inside the modal
                $modal_error = 'Invalid data. Please check your inputs.';
            }
        } elseif ($action === 'complete_profile') {
        $state = htmlspecialchars(trim($_POST['state'] ?? ''), ENT_QUOTES, 'UTF-8');
        $district = htmlspecialchars(trim($_POST['district'] ?? ''), ENT_QUOTES, 'UTF-8');
        $city = htmlspecialchars(trim($_POST['city'] ?? ''), ENT_QUOTES, 'UTF-8');

        try {
            $upd = $pdo->prepare('UPDATE donors SET state = ?, district = ?, city = ? WHERE id = ?');
            $upd->execute([$state, $district, $city, $donorId]);
            $_SESSION['message'] = 'Profile completed successfully!';
        } catch (Exception $e) {
            $_SESSION['message'] = 'Error completing profile: ' . $e->getMessage();
        }
    } elseif ($action === 'edit_profile') {
        $name = htmlspecialchars(trim($_POST['name'] ?? $me['full_name']), ENT_QUOTES, 'UTF-8');
        $phone = htmlspecialchars(trim($_POST['phone'] ?? $me['phone']), ENT_QUOTES, 'UTF-8');
        $dob = htmlspecialchars(trim($_POST['dob'] ?? $me['dob']), ENT_QUOTES, 'UTF-8');
        $email = htmlspecialchars(trim($_POST['email'] ?? $me['email']), ENT_QUOTES, 'UTF-8');
        $blood_type = htmlspecialchars(trim($_POST['blood_type'] ?? $me['blood_type']), ENT_QUOTES, 'UTF-8');
        $country = htmlspecialchars(trim($_POST['country'] ?? $me['country']), ENT_QUOTES, 'UTF-8');
        $state = htmlspecialchars(trim($_POST['state'] ?? $me['state']), ENT_QUOTES, 'UTF-8');
        $district = htmlspecialchars(trim($_POST['district'] ?? $me['district']), ENT_QUOTES, 'UTF-8');
        $city = htmlspecialchars(trim($_POST['city'] ?? $me['city']), ENT_QUOTES, 'UTF-8');
        $password = $_POST['password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';

        try {
            // Validate password if provided
            if (!empty($password)) {
                if ($password !== $confirm_password) {
                    throw new Exception('Password and Confirm Password do not match.');
                }
                if (strlen($password) < 6) {
                    throw new Exception('Password must be at least 6 characters long.');
                }
                $password_hash = password_hash($password, PASSWORD_DEFAULT);
            } else {
                $password_hash = $me['password_hash'];
            }

            $upd = $pdo->prepare('UPDATE donors SET full_name = ?, phone = ?, dob = ?, email = ?, password_hash = ?, blood_type = ?, country = ?, state = ?, district = ?, city = ? WHERE id = ?');
            if (!$upd) {
                throw new Exception('Prepare failed: ' . implode(' ', $pdo->errorInfo()));
            }
            $result = $upd->execute([$name, $phone, $dob, $email, $password_hash, $blood_type, $country, $state, $district, $city, $donorId]);
            if (!$result) {
                throw new Exception('Execute failed: ' . implode(' ', $pdo->errorInfo()));
            }
            $_SESSION['message'] = 'Profile updated successfully.';
        } catch (Exception $e) {
            $_SESSION['message'] = 'Error updating profile: ' . $e->getMessage();
        }
    // Friend-related actions removed
    } elseif ($action === 'add_donation') {
        // insert into donations table
        $notes = htmlspecialchars(trim($_POST['notes'] ?? ''), ENT_QUOTES, 'UTF-8');
        $units = (float)($_POST['units'] ?? 1.0);
        $donationDate = htmlspecialchars(trim($_POST['donation_date'] ?? date('Y-m-d')), ENT_QUOTES, 'UTF-8');

        // Validate units
        if ($units < 0.1 || $units > 10) {
            $_SESSION['message'] = 'Units must be between 0.1 and 10.';
            header('Location: donor_dashboard.php');
            exit;
        }

        // Check eligibility: only allow after 90 days from last donation or if no donations
        $lastDonationStmt = $pdo->prepare('SELECT date FROM donations WHERE donor_id = :id ORDER BY date DESC LIMIT 1');
        $lastDonationStmt->execute([':id' => $donorId]);
        $lastDonation = $lastDonationStmt->fetch(PDO::FETCH_ASSOC);
        if ($lastDonation) {
            $lastDate = new DateTime($lastDonation['date']);
            $nextEligible = clone $lastDate;
            $nextEligible->modify('+90 days');
            $donationDateObj = new DateTime($donationDate);
            if ($donationDateObj < $nextEligible) {
                $_SESSION['message'] = 'You can only add a new donation after 90 days from your last donation.';
                header('Location: donor_dashboard.php');
                exit;
            }
        }

        $ins = $pdo->prepare('INSERT INTO donations (donor_id, date, units, notes) VALUES (:did, :date, :units, :notes)');
        if ($ins->execute([':did' => $donorId, ':date' => $donationDate, ':units' => $units, ':notes' => $notes])) {
            // Automatically set availability to Unavailable after donation
            $availabilityUpdate = $pdo->prepare('UPDATE donors SET availability = ? WHERE id = ?');
            $availabilityUpdate->execute(['Unavailable', $donorId]);
            
            $_SESSION['message'] = 'Donation recorded successfully! Your availability has been automatically set to "Not Available" for the next 90 days.';
        } else {
            $_SESSION['message'] = 'Failed to record donation. Please try again.';
        }
    } elseif ($action === 'add_reminder') {
        $rdate = htmlspecialchars(trim($_POST['reminder_date'] ?? ''), ENT_QUOTES, 'UTF-8');
        $rtext = htmlspecialchars(trim($_POST['reminder_text'] ?? ''), ENT_QUOTES, 'UTF-8');
        if (!empty($rdate) && !empty($rtext)) {
            $ins = $pdo->prepare('INSERT INTO reminders (donor_id, reminder_date, message, created_at) VALUES (:did, :rdate, :msg, NOW())');
            $ins->execute([':did' => $donorId, ':rdate' => $rdate ?: null, ':msg' => $rtext]);
            $_SESSION['message'] = 'Reminder added.';
        } else {
            $_SESSION['message'] = 'Please provide both date and message for the reminder.';
        }
    } elseif ($action === 'edit_donation') {
        $id = (int)$_POST['donation_id'];
        $units = (float)($_POST['units'] ?? 1.0);
        $donationDate = htmlspecialchars(trim($_POST['donation_date'] ?? ''), ENT_QUOTES, 'UTF-8');
        $notes = htmlspecialchars(trim($_POST['notes'] ?? ''), ENT_QUOTES, 'UTF-8');

        // Validate units
        if ($units < 0.1 || $units > 10) {
            $_SESSION['message'] = 'Units must be between 0.1 and 10.';
            header('Location: donor_dashboard.php');
            exit;
        }

        // Apply same validations as adding new donation
        // Check eligibility: only allow after 90 days from other donations (excluding current one being edited)
        $lastDonationStmt = $pdo->prepare('SELECT date FROM donations WHERE donor_id = :id AND id != :current_id ORDER BY date DESC LIMIT 1');
        $lastDonationStmt->execute([':id' => $donorId, ':current_id' => $id]);
        $lastDonation = $lastDonationStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($lastDonation) {
            $lastDate = new DateTime($lastDonation['date']);
            $nextEligible = clone $lastDate;
            $nextEligible->modify('+90 days');
            $donationDateObj = new DateTime($donationDate);
            if ($donationDateObj < $nextEligible) {
                $_SESSION['message'] = 'You can only edit a donation to be after 90 days from your other donations.';
                header('Location: donor_dashboard.php');
                exit;
            }
        }

        // Also check if the new date conflicts with future donations
        $futureDonationStmt = $pdo->prepare('SELECT date FROM donations WHERE donor_id = :id AND id != :current_id AND date > :edit_date ORDER BY date ASC LIMIT 1');
        $futureDonationStmt->execute([':id' => $donorId, ':current_id' => $id, ':edit_date' => $donationDate]);
        $futureDonation = $futureDonationStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($futureDonation) {
            $futureDate = new DateTime($futureDonation['date']);
            $editDateObj = new DateTime($donationDate);
            $editDatePlus90 = clone $editDateObj;
            $editDatePlus90->modify('+90 days');
            
            if ($futureDate < $editDatePlus90) {
                $_SESSION['message'] = 'This donation date would conflict with your future donations. There must be at least 90 days between donations.';
                header('Location: donor_dashboard.php');
                exit;
            }
        }

        $upd = $pdo->prepare('UPDATE donations SET date = :date, units = :units, notes = :notes WHERE id = :id AND donor_id = :did');
        if ($upd->execute([':date' => $donationDate, ':units' => $units, ':notes' => $notes, ':id' => $id, ':did' => $donorId])) {
            // After updating donation, recalculate availability based on all donations
            updateDonorAvailability($pdo, $donorId);
            $_SESSION['message'] = 'Donation updated successfully. Your availability has been recalculated automatically.';
        } else {
            $_SESSION['message'] = 'Failed to update donation. Please try again.';
        }
    } elseif ($action === 'delete_donation') {
        $id = (int)$_POST['donation_id'];
        $del = $pdo->prepare('DELETE FROM donations WHERE id = :id AND donor_id = :did');
        $del->execute([':id' => $id, ':did' => $donorId]);
        
        // After deleting donation, update availability based on remaining donations
        updateDonorAvailability($pdo, $donorId);
        
        $_SESSION['message'] = 'Donation deleted. Your availability has been updated automatically.';
    } elseif ($action === 'edit_reminder') {
        $id = (int)$_POST['reminder_id'];
        $rdate = htmlspecialchars(trim($_POST['reminder_date'] ?? ''), ENT_QUOTES, 'UTF-8');
        $rtext = htmlspecialchars(trim($_POST['reminder_text'] ?? ''), ENT_QUOTES, 'UTF-8');
        $upd = $pdo->prepare('UPDATE reminders SET reminder_date = :rdate, message = :msg WHERE id = :id AND donor_id = :did');
        $upd->execute([':rdate' => $rdate, ':msg' => $rtext, ':id' => $id, ':did' => $donorId]);
        $_SESSION['message'] = 'Reminder updated.';
    } elseif ($action === 'delete_reminder') {
        $id = (int)$_POST['reminder_id'];
        $del = $pdo->prepare('DELETE FROM reminders WHERE id = :id AND donor_id = :did');
        $del->execute([':id' => $id, ':did' => $donorId]);
        $_SESSION['message'] = 'Reminder deleted.';
    } elseif ($action === 'search_donors') {
        $bloodType = htmlspecialchars(trim($_POST['search_blood_type'] ?? ''), ENT_QUOTES, 'UTF-8');
        $country = htmlspecialchars(trim($_POST['search_country'] ?? ''), ENT_QUOTES, 'UTF-8');
        $query = 'SELECT id, full_name, blood_type, phone, availability FROM donors WHERE id != :id AND availability = \'Available\'';
        $params = [':id' => $donorId];
        if (!empty($bloodType) && $bloodType !== 'All') {
            $query .= ' AND blood_type = :blood_type';
            $params[':blood_type'] = $bloodType;
        }
        if (!empty($country) && $country !== 'All') {
            $query .= ' AND country = :country';
            $params[':country'] = $country;
        }
        $query .= ' ORDER BY full_name ASC';
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $_SESSION['searchResults'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        header('Location: donor_dashboard.php');
        exit;
    } elseif ($action === 'ajax_search_donors') {
        $bloodType = htmlspecialchars(trim($_POST['blood_type'] ?? ''), ENT_QUOTES, 'UTF-8');
        $country = htmlspecialchars(trim($_POST['country'] ?? ''), ENT_QUOTES, 'UTF-8');
        $query = 'SELECT id, full_name, blood_type, phone, availability FROM donors WHERE id != :id AND availability = \'Available\'';
        $params = [':id' => $donorId];
        if (!empty($bloodType) && $bloodType !== 'All') {
            $query .= ' AND blood_type = :blood_type';
            $params[':blood_type'] = $bloodType;
        }
        if (!empty($country) && $country !== 'All') {
            $query .= ' AND country = :country';
            $params[':country'] = $country;
        }
        $query .= ' ORDER BY full_name ASC';
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        header('Content-Type: application/json');
        echo json_encode($results);
        exit;
    }
    // Only redirect if session and donor are valid
    if (isset($_SESSION['donor_id']) && $me) {
        header('Location: donor_dashboard.php');
        exit;
    }
    // If session is destroyed or donor not found, do not redirect (error already shown above)  
    exit;
}
$message = $_SESSION['message'] ?? '';
unset($_SESSION['message']);

$searchResults = $_SESSION['searchResults'] ?? [];
unset($_SESSION['searchResults']);

// fetch donation history
$historyStmt = $pdo->prepare('SELECT * FROM donations WHERE donor_id = :id ORDER BY date DESC');
$historyStmt->execute([':id' => $donorId]);
$history = $historyStmt->fetchAll(PDO::FETCH_ASSOC);

// fetch reminders
$remStmt = $pdo->prepare('SELECT * FROM reminders WHERE donor_id = :id ORDER BY reminder_date ASC');
$remStmt->execute([':id' => $donorId]);
$rem = $remStmt->fetchAll(PDO::FETCH_ASSOC);

// Friend-related queries removed

// Check if mandatory details are filled
$mandatoryFields = ['full_name', 'email', 'blood_type', 'dob', 'phone', 'country'];
$showMandatoryPopup = false;
foreach ($mandatoryFields as $field) {
    if (empty($me[$field])) {
        $showMandatoryPopup = true;
        break;
    }
}

// Check if location details are completed
$locationFields = ['state', 'district', 'city'];
$locationCompleted = true;
foreach ($locationFields as $field) {
    if (empty($me[$field])) {
        $locationCompleted = false;
        break;
    }
}

$countryCodes = [
    'India' => '+91',
    'Nepal' => '+977',
    'Sri Lanka' => '+94',
    'Bangladesh' => '+880',
    'Indonesia' => '+62',
    'Malaysia' => '+60',
    'Vietnam' => '+84',
    'Japan' => '+81',
    'United States' => '+1',
    'United Kingdom' => '+44',
    'Canada' => '+1',
    'Australia' => '+61'
];

$phonePatterns = [
    'India' => '^[6-9]\d{9}$',
    'Nepal' => '^9[6-8]\d{7}$',
    'Sri Lanka' => '^7\d{8}$',
    'Bangladesh' => '^1[3-9]\d{8}$',
    'Indonesia' => '^\d{9,12}$',
    'Malaysia' => '^\d{9,10}$',
    'Vietnam' => '^\d{9,10}$',
    'Japan' => '^\d{9,10}$',
    'United States' => '^\d{10}$',
    'United Kingdom' => '^\d{10}$',
    'Canada' => '^\d{10}$',
    'Australia' => '^\d{9}$'
];

$countries = ['India', 'Nepal', 'Sri Lanka', 'Bangladesh', 'Indonesia', 'Malaysia', 'Vietnam', 'Japan', 'United States', 'United Kingdom', 'Canada', 'Australia'];

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Donor Dashboard - Friends2Support</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --bg-dark: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            --card-bg: rgba(255, 255, 255, 0.95);
            --card-bg-dark: rgba(30, 41, 59, 0.95);
            --text-primary: #111827;
            --text-primary-dark: #f1f5f9;
            --accent: #dc2626;
            --accent-dark: #ef4444;
        }

        [data-theme="dark"] {
            --bg-primary: var(--bg-dark);
            --card-bg: var(--card-bg-dark);
            --text-primary: var(--text-primary-dark);
            --accent: var(--accent-dark);
        }

        body {
            font-family: 'Inter', sans-serif;
            transition: background 0.3s ease, color 0.3s ease;
        }

        .modern-bg {
            background: var(--bg-primary);
            min-height: 100vh;
        }

        .floating-element {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            animation: float 20s linear infinite;
            backdrop-filter: blur(10px);
        }

        .floating-element:nth-child(1) {
            width: 200px;
            height: 200px;
            top: 10%;
            left: 20%;
            animation-duration: 25s;
        }
        .floating-element:nth-child(2) {
            width: 150px;
            height: 150px;
            top: 60%;
            left: 70%;
            animation-duration: 30s;
            animation-delay: 5s;
        }
        .floating-element:nth-child(3) {
            width: 300px;
            height: 300px;
            top: 40%;
            left: 40%;
            animation-duration: 35s;
            animation-delay: 10s;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }

        .modern-card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            border-radius: 24px;
            position: relative;
            z-index: 10;
            transition: all 0.3s ease;
        }

        .modern-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 35px 60px rgba(0, 0, 0, 0.2);
        }

        .modern-input {
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            padding: 0.75rem;
            transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        
        .modern-input:focus {
            outline: none;
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        /* Full-screen modal specific styles */
        #complete-profile-modal {
            backdrop-filter: blur(8px);
            animation: modalFadeIn 0.4s ease-out;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 99999 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        
        /* Fix input field positioning issues */
        #complete-profile-modal .relative {
            position: relative !important;
        }
        
        #complete-profile-modal .absolute {
            position: absolute !important;
        }
        
        /* Ensure icons stay with inputs during scroll */
        #complete-profile-modal input,
        #complete-profile-modal select {
            position: relative !important;
            z-index: 1 !important;
        }
        
        #complete-profile-modal .absolute.inset-y-0 {
            position: absolute !important;
            top: 0 !important;
            bottom: 0 !important;
            z-index: 2 !important;
        }
        
        @keyframes modalFadeIn {
            from {
                opacity: 0;
                transform: scale(0.95);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        /* Enhanced form styling */
        #complete-profile-modal .modern-input:focus {
            border-color: #ef4444;
            box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
            transform: translateY(-1px);
        }
        
        #complete-profile-modal select.modern-input:focus {
            border-color: #ef4444;
            box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
        }
        
        /* Optimized scrolling for the modal content */
        #complete-profile-modal .overflow-y-auto {
            scrollbar-width: thin;
            scrollbar-color: #ef4444 transparent;
            scroll-behavior: auto !important;
            -webkit-overflow-scrolling: touch !important;
            position: relative !important;
            will-change: scroll-position !important;
            contain: layout style paint !important;
        }
        
        #complete-profile-modal .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
        }
        
        #complete-profile-modal .overflow-y-auto::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
        }
        
        #complete-profile-modal .overflow-y-auto::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        #complete-profile-modal .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
        }
        
        /* Optimize performance and prevent lag */
        #complete-profile-modal * {
            transform-style: flat !important;
            -webkit-transform-style: flat !important;
        }
        
        /* Remove problematic transforms that cause lag */
        #complete-profile-modal .group-hover\\:scale-105,
        #complete-profile-modal .hover\\:scale-105,
        #complete-profile-modal .transform {
            transform: none !important;
            transition: none !important;
        }
        
        /* Fix input container positioning */
        #complete-profile-modal .relative input,
        #complete-profile-modal .relative select {
            width: 100% !important;
            box-sizing: border-box !important;
        }
        
        /* Ensure icons don't move during scroll */
        #complete-profile-modal .absolute.inset-y-0.left-4,
        #complete-profile-modal .absolute.inset-y-0.right-4 {
            pointer-events: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* Fix input field alignment and performance */
        #complete-profile-modal .modern-input {
            will-change: auto !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
            line-height: 1.5 !important;
            display: flex !important;
            align-items: center !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            height: 60px !important;
        }
        
        /* Improve text alignment in inputs */
        #complete-profile-modal input.modern-input,
        #complete-profile-modal select.modern-input {
            vertical-align: middle !important;
            text-align: left !important;
            padding-left: 48px !important;
            padding-right: 40px !important;
            font-size: 16px !important;
            line-height: 1.5 !important;
        }
        
        /* Fix icon positioning for better alignment */
        #complete-profile-modal .absolute.inset-y-0.left-4 {
            left: 12px !important;
            width: 24px !important;
            height: 100% !important;
        }
        
        #complete-profile-modal .absolute.inset-y-0.right-4 {
            right: 12px !important;
            width: 24px !important;
            height: 100% !important;
        }
        
        /* Optimized button effects - no transforms */
        #complete-profile-modal button {
            transition: background-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        
        /* Animated elements */
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        #complete-profile-modal .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        
        /* Edit Profile Modal - Same optimizations as Complete Profile */
        #profile-modal {
            backdrop-filter: blur(8px);
            animation: modalFadeIn 0.4s ease-out;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 99998 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }
        
        /* Apply same performance optimizations to Edit Profile modal */
        #profile-modal * {
            transform-style: flat !important;
            -webkit-transform-style: flat !important;
        }
        
        #profile-modal .overflow-y-auto {
            scrollbar-width: thin;
            scrollbar-color: #10b981 transparent;
            scroll-behavior: auto !important;
            -webkit-overflow-scrolling: touch !important;
            position: relative !important;
            will-change: scroll-position !important;
            contain: layout style paint !important;
        }
        
        #profile-modal .modern-input {
            will-change: auto !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
            line-height: 1.5 !important;
            display: flex !important;
            align-items: center !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            height: 60px !important;
        }
        
        #profile-modal input.modern-input,
        #profile-modal select.modern-input {
            vertical-align: middle !important;
            text-align: left !important;
        }
        
        #profile-modal .absolute.inset-y-0 {
            position: absolute !important;
            top: 0 !important;
            bottom: 0 !important;
            z-index: 2 !important;
            pointer-events: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        #profile-modal button {
            transition: background-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        
        /* Disable focus and hover effects on readonly inputs inside mandatory modal */
        #mandatory-modal .modern-input[readonly]:focus,
        #mandatory-modal .modern-input[readonly]:hover {
            border-color: initial !important;
            box-shadow: none !important;
            transform: none !important;
            outline: none !important;
            cursor: default;
        }

        /* Remove focus transform for phone inputs */
        #profile-phone:focus,
        #mandatory-phone:focus {
            transform: none !important;
        }

        /* Remove hover red border for mandatory fields */
        #country-mandatory:hover,
        #mandatory-phone:hover,
        #mandatory-country-code:hover {
            border-color: #d1d5db !important;
        }

        /* Remove red selection border for country and phone fields */
        #profile-country:focus,
        #profile-phone:focus,
        #country-mandatory:focus,
        #mandatory-phone:focus {
            border-color: #d1d5db !important;
            box-shadow: none !important;
        }

        .modern-input::placeholder {
            color: #9ca3af;
        }

        .modern-btn {
            background: linear-gradient(135deg, var(--accent), #991b1b);
            border: none;
            border-radius: 16px;
            padding: 16px 28px;
            color: white;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        }

        .modern-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
        }

        .modern-btn:hover::before {
            left: 100%;
        }

        .modern-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 35px rgba(220, 38, 38, 0.4);
        }

        .modern-btn:active {
            transform: translateY(0);
        }

        .modern-header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .stat-number {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--accent);
            margin-bottom: 8px;
        }

        .stat-label {
            font-size: 0.9rem;
            color: var(--text-primary);
            opacity: 0.8;
        }

        .profile-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent), #991b1b);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            font-size: 2rem;
            color: white;
            box-shadow: 0 10px 30px rgba(220, 38, 38, 0.3);
        }

        .profile-edit-btn {
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .profile-edit-btn:hover {
            transform: scale(1.1);
            background: linear-gradient(135deg, #1d4ed8, #1e40af);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.6);
        }

        .profile-container {
            display: flex;
            justify-content: center;
            margin-bottom: 1rem;
        }

        .profile-wrapper {
            position: relative;
            display: inline-block;
        }

        .sidebar-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 12px;
            transition: all 0.3s ease;
            color: #6b7280;
            text-decoration: none;
        }

        .sidebar-link:hover {
            background: rgba(220, 38, 38, 0.1);
            color: var(--accent);
            transform: translateX(5px);
        }

        .sidebar-link.active {
            background: rgba(220, 38, 38, 0.2);
            color: var(--accent);
            font-weight: 600;
        }

        .fade-in {
            animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .slide-in {
            animation: slideIn 0.8s ease-out;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .bounce-in {
            animation: bounceIn 0.6s ease-out;
        }

        @keyframes bounceIn {
            0% { opacity: 0; transform: scale(0.3); }
            50% { opacity: 1; transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
        }

        .success-message {
            background: linear-gradient(135deg, #dcfce7, #bbf7d0);
            border: 3px solid #16a34a;
            color: #15803d;
            padding: 24px 28px;
            border-radius: 20px;
            margin-bottom: 24px;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(34, 197, 94, 0.25);
            position: relative;
            animation: successPulse 0.6s ease-in-out;
        }

        @keyframes successPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        .theme-toggle {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            color: white;
        }

        .theme-toggle:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .modern-card {
                margin: 16px;
                border-radius: 16px;
            }

            .floating-element {
                display: none;
            }

            .modern-header {
                padding: 12px 16px;
            }

            .modern-header h1 {
                font-size: 18px;
            }

            .modern-header p {
                font-size: 12px;
            }

            .modern-input {
                padding: 12px 16px;
                font-size: 16px;
            }

            .modern-btn {
                padding: 14px 24px;
                font-size: 16px;
            }

            .stat-card {
                padding: 16px;
            }

            .stat-number {
                font-size: 2rem;
            }
        }

        @media (max-width: 480px) {
            .modern-card {
                margin: 12px;
                border-radius: 12px;
            }

            .grid.grid-cols-2 {
                gap: 8px;
            }

            .grid.grid-cols-1.md\:grid-cols-3 {
                gap: 8px;
            }

            .modern-input {
                padding: 10px 14px;
            }

            .modern-btn {
                padding: 12px 20px;
            }
        }

        html {
            scroll-behavior: smooth;
        }

        .modern-input:focus,
        .modern-btn:focus,
        .sidebar-link:focus {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        .modern-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        .modern-btn:disabled:hover {
            transform: none !important;
            box-shadow: none !important;
        }

        /* Improved scrolling for modals */
        .modal-scroll {
            scrollbar-width: thin;
            scrollbar-color: #dc2626 #f1f5f9;
            scroll-behavior: smooth;
        }

        .modal-scroll::-webkit-scrollbar {
            width: 8px;
        }

        .modal-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
        }

        .modal-scroll::-webkit-scrollbar-thumb {
            background: #dc2626;
            border-radius: 4px;
        }

        .modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #991b1b;
        }

        /* Modal positioning fixes */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            overflow-y: auto;
            z-index: 50;
        }

        .modal-content-box {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            width: 100%;
            max-width: 80rem;
            max-height: 85vh;
            margin: auto;
            position: relative;
            overflow: hidden;
        }

        .modal-body {
            flex: 1;
            overflow-y: auto;
        }

        /* Ensure proper modal sizing and positioning */
        .modal-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1rem;
        }

        .modal-content {
            width: 100%;
            max-width: 80rem;
            max-height: 90vh;
            margin: auto;
            display: flex;
            flex-direction: column;
        }

            padding: 2rem;
        }

        /* Fix for form sections spacing */
        .form-section {
            margin-bottom: 1.5rem;
        }

        .form-section:last-child {
            margin-bottom: 0;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .modal-content {
                max-height: 95vh;
                margin: 0.5rem;
            }
            
            .modal-body {
                padding: 1rem;
            }
        }

        /* Button section styling */
        .button-section {
            border-top: 1px solid #e5e7eb;
            padding-top: 2rem;
            margin-top: 1.5rem;
        }

        /* Fixed close button styling */
        .modal-close-btn {
            position: absolute;
            top: 1rem;
            right: 1rem;
            z-index: 30;
            background: white;
            border-radius: 50%;
            padding: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .modal-close-btn:hover {
            background: #f3f4f6;
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
            transform: scale(1.05);
        }

        /* Enhanced responsive modal fixes */
        @media (max-height: 600px) {
            .modal-content-box {
                max-height: 98vh;
            }
            
            .modal-scroll {
                padding: 1rem;
            }
            
            .form-section {
                margin-bottom: 1rem;
            }
        }

        @media (max-width: 640px) {
            .modal-content-container {
                margin: 0.5rem auto;
                max-height: calc(100vh - 1rem);
            }
            
            .modal-scroll {
                padding: 1rem;
            }
            
            .modal-close-btn {
                top: 0.5rem;
                right: 0.5rem;
            }

            .form-section {
                padding: 1rem;
            }

            .grid.md\\:grid-cols-2 {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .grid.md\\:grid-cols-3 {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
        }

        /* Ensure modal fits in small windows */
        @media (max-width: 480px), (max-height: 500px) {
            .modal-backdrop {
                padding: 0.25rem;
            }
            
            .modal-content-box {
                max-height: 99vh;
                border-radius: 0.5rem;
            }
            
            .modal-scroll {
                padding: 0.75rem;
            }
        }

        /* Ensure proper modal scrolling */
        .modal-backdrop {
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        .modal-backdrop::-webkit-scrollbar {
            width: 0;
            background: transparent;
        }

        /* Ensure modal content doesn't overlap with close button */
        .modal-content-wrapper {
            padding-top: 1rem;
        }

        /* Enhanced form sections */
        .form-section {
            transition: all 0.3s ease;
        }

        .form-section:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        /* Password visibility button */
        .password-toggle {
            cursor: pointer;
            transition: color 0.3s ease;
        }

        .password-toggle:hover {
            color: #dc2626 !important;
        }

        /* Profile completion indicator */
        .profile-complete-indicator {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
            }
        }
    </style>
</head>
<body class="modern-bg">
    <!-- Floating Background Elements -->
    <div class="floating-element"></div>
    <div class="floating-element"></div>
    <div class="floating-element"></div>
    
    <!-- Modern Header -->
    <header class="modern-header">
        <div class="container mx-auto px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-white">Friends2Support</h1>
                            <p class="text-white/80 text-sm">Blood Donation Portal</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                    
                    </div>
                </div>
        </div>
    </header>

    <div class="container mx-auto px-6 py-10 min-h-screen">
        <div class="text-center mb-8 fade-in">
            <h1 class="text-3xl font-bold text-white mb-2">Donor Dashboard</h1>
            <p class="text-white/80">Manage your profile and donations</p>
        </div>
        
        <?php if ($message):
            // Detect if message is success or error
            $isError = stripos($message, 'Error') !== false ||
           stripos($message, 'Failed') !== false ||
           stripos($message, 'not found') !== false ||
           stripos($message, 'already registered') !== false ||
           stripos($message, 'already exists') !== false ||
           stripos($message, 'cannot') !== false ||
           stripos($message, 'invalid') !== false ||
           stripos($message, 'deleted') !== false ||
           stripos($message, 'removed') !== false ||
           stripos($message, 'You can only') !== false;
            
            if ($isError) {
                $bgGradient = 'linear-gradient(135deg, #fee2e2, #fecaca)';
                $borderColor = '#dc2626';
                $textColor = '#991b1b';
                $iconBg = 'bg-red-600';
                $icon = 'fa-times';
            } else {
                $bgGradient = 'linear-gradient(135deg, #dcfce7, #bbf7d0)';
                $borderColor = '#16a34a';
                $textColor = '#15803d';
                $iconBg = 'bg-green-600';
                $icon = 'fa-check';
            }
        ?>
        <div id="success-message" class="success-message fade-in" style="background: <?php echo $bgGradient; ?>; border: 3px solid <?php echo $borderColor; ?>; color: <?php echo $textColor; ?>;">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                <div class="w-8 h-8 <?php echo $iconBg; ?> rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <i class="fas <?php echo $icon; ?> text-white"></i>
                    </div>
                    <span class="font-semibold"><?php echo htmlspecialchars($message); ?></span>
                </div>
                <button onclick="closeMessage()" class="text-gray-500 hover:text-gray-700 ml-3 text-xl font-bold" aria-label="Close message">&times;</button>
            </div>
        </div>
        <script>
            function closeMessage() {
                const msg = document.getElementById('success-message');
                if (msg) {
                    msg.style.transition = 'opacity 0.5s ease';
                    msg.style.opacity = '0';
                    setTimeout(() => msg.remove(), 500);
                }
            }
            // Auto-close message after 5 seconds
            if (document.getElementById('success-message')) {
                setTimeout(closeMessage, 5000);
            }
            // Scroll to top if message is present
            window.scrollTo(0, 0);
        </script>
        <?php endif; ?>

        <?php if (empty($history)): ?>
        <div id="no-history-message" class="success-message fade-in" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border: 3px solid #3b82f6; color: #1e40af;">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <i class="fas fa-info text-white"></i>
                    </div>
                    <span class="font-semibold">No donation history found. Please record your first donation below.</span>
                </div>
            </div>
        </div>
        <script>
            // Scroll to add donation section if no history
            window.addEventListener('load', function() {
                const addDonationSection = document.getElementById('add-donation-section');
                if (addDonationSection) {
                    addDonationSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        </script>
        <?php endif; ?>

        <div class="flex gap-6">
            <!-- Left Sidebar Navigation -->
            <div class="w-64 modern-card p-6 fade-in">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Navigation</h3>
                <nav class="space-y-2">
                    <a href="#about" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-info-circle text-lg"></i>
                        About Us
                    </a>
                    <a href="#vision" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-eye text-lg"></i>
                        Vision & Mission
                    </a>
                    <div class="text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2">
                        <i class="fas fa-users text-lg"></i>
                        People Behind
                    </div>
                    <div class="ml-6 space-y-1">
                        <a href="#founders" class="sidebar-link text-blue-600 text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                            <i class="fas fa-user-tie text-base"></i>
                            Founders
                        </a>
                        <a href="#tech" class="sidebar-link text-blue-600 text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                            <i class="fas fa-code text-base"></i>
                            Technical Team
                        </a>
                        <a href="#volunteers" class="sidebar-link text-blue-600 text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                            <i class="fas fa-hands-helping text-base"></i>
                            Field Volunteers
                        </a>
                        <a href="#campaign" class="sidebar-link text-blue-600 text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                            <i class="fas fa-bullhorn text-base"></i>
                            Campaign Team
                        </a>
                    </div>
                    <a href="#facts" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-book-open text-lg"></i>
                        Blood Donation Facts
                    </a>
                    <a href="#who-can" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-check-circle text-lg"></i>
                        Who can/ Can't Donate
                    </a>
                    
                    <!-- Additional Blood Donation Related Items -->
                    <div class="border-t border-gray-200 my-4 pt-4">
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">Blood Donation Resources</h4>
                    </div>
                    
                    <a href="#donation-process" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-route text-lg"></i>
                        Donation Process
                    </a>
                    
                    <a href="#blood-types" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-tint text-lg"></i>
                        Blood Types Guide
                    </a>
                    
                    <a href="#health-benefits" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-heart text-lg"></i>
                        Health Benefits
                    </a>
                    
                    <a href="#preparation-tips" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-clipboard-list text-lg"></i>
                        Preparation Tips
                    </a>
                    
                    <a href="#aftercare" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-shield-alt text-lg"></i>
                        Post-Donation Care
                    </a>
                    
                    <a href="#myths-facts" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-lightbulb text-lg"></i>
                        Myths vs Facts
                    </a>
                    
                    <a href="#emergency-blood" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-ambulance text-lg"></i>
                        Emergency Blood Need
                    </a>
                    
                    <a href="#donation-centers" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-map-marker-alt text-lg"></i>
                        Nearby Centers
                    </a>
                    
                    <a href="#blood-drives" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-calendar-alt text-lg"></i>
                        Blood Drives & Events
                    </a>
                    
                    <a href="#donor-stories" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-heart text-lg"></i>
                        Donor Success Stories
                    </a>
                    
                    <a href="#faq" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-question-circle text-lg"></i>
                        Frequently Asked Questions
                    </a>
                    
                    <a href="#contact-support" class="sidebar-link text-red-600 font-semibold text-sm flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300">
                        <i class="fas fa-headset text-lg"></i>
                        Contact Support
                    </a>
                    

            </div>
            
            <!-- Main Content -->
            <div class="flex-1 space-y-6">
                <div class="modern-card p-6 fade-in">
                    <div class="flex items-center justify-between mb-6">
                        <h1 class="text-2xl font-bold text-gray-800">Welcome, <?php echo htmlspecialchars($me['full_name']); ?></h1>
                        <a href="donor_login.php" class="modern-btn text-sm px-4 py-2">Logout</a>
                    </div>

                    <!-- Dashboard Stats Overview -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="stat-card">
                            <div class="stat-number"><?php echo count($history); ?></div>
                            <div class="stat-label">Total Donations</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number"><?php echo !empty($history) ? date('d-m-Y', strtotime($history[0]['date'])) : 'None'; ?></div>
                            <div class="stat-label">Last Donation</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number"><?php echo count($rem); ?></div>
                            <div class="stat-label">Active Reminders</div>
                        </div>
                    </div>

                    <?php
                    // Calculate eligibility countdown
                    $eligibilityMessage = '';
                    $daysRemaining = 0;
                    if (!empty($history)) {
                        $lastDonationDate = new DateTime($history[0]['date']);
                        $nextEligibleDate = clone $lastDonationDate;
                        $nextEligibleDate->modify('+90 days');
                        $today = new DateTime();
                        $interval = $today->diff($nextEligibleDate);
                        $daysRemaining = (int)$interval->format('%r%a');
                        if ($daysRemaining <= 0) {
                            $eligibilityMessage = 'You are eligible to donate now!';
                        } else {
                            $eligibilityMessage = "Next eligible donation in $daysRemaining day" . ($daysRemaining > 1 ? 's' : '') . ".";
                        }
                    } else {
                        $eligibilityMessage = 'No donation history available. You are eligible to donate.';
                    }
                    $nextEligibleTimestamp = 0;
                    if (!empty($history) && $daysRemaining > 0) {
                        $nextEligibleTimestamp = $nextEligibleDate->getTimestamp() * 1000;
                    }
                    ?>

                    <div class="grid lg:grid-cols-3 gap-6">
                        <!-- Profile Info Card -->
                        <div class="lg:col-span-1 modern-card p-5">
                            <div class="profile-container">
                                <div class="profile-wrapper">
                                    <?php if (!empty($me['profile_picture']) && file_exists(__DIR__ . '/' . $me['profile_picture'])): ?>
                                        <img src="<?php echo htmlspecialchars($me['profile_picture']); ?>" alt="Profile Picture" class="w-20 h-20 rounded-full object-cover shadow-lg border-4 border-white">
                                    <?php else: ?>
                                        <div class="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            <?php echo strtoupper(substr($me['full_name'], 0, 1)); ?>
                                        </div>
                                    <?php endif; ?>
                                    <button onclick="openProfilePictureModal()" class="profile-edit-btn" title="Edit Profile Picture">
                                        <i class="fas fa-camera text-xs"></i>
                                    </button>
                                </div>
                            </div>
                            <h2 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-user text-red-600"></i>
                                Profile
                            </h2>
                            <p class="text-sm text-gray-600 flex items-center gap-2">
                                <i class="fas fa-user text-gray-500"></i>
                                Name: <span class="font-medium text-gray-900"><?php echo htmlspecialchars($me['full_name']); ?></span>
                            </p>
                            <p class="text-sm text-gray-600 flex items-center gap-2">
                                <i class="fas fa-tint text-red-600"></i>
                                Blood Group: <span class="font-medium text-gray-900"><?php echo htmlspecialchars($me['blood_type'] ?? ''); ?></span>
                            </p>
                            <p class="text-sm text-gray-600 flex items-center gap-2">
                                <i class="fas fa-calendar text-blue-600"></i>
                                Date of Birth: <span class="font-medium text-gray-900"><?php echo !empty($me['dob']) ? date('d-m-Y', strtotime($me['dob'])) : 'Not set'; ?></span>
                            </p>
                            <?php 
                            $isAvailable = ($me['availability'] ?? 'Available') === 'Available';
                            
                            // Calculate days since last donation for display
                            $daysSinceLastDonation = null;
                            $nextAvailableDate = null;
                            $lastDonationStmt = $pdo->prepare('SELECT date FROM donations WHERE donor_id = ? ORDER BY date DESC LIMIT 1');
                            $lastDonationStmt->execute([$donorId]);
                            $lastDonation = $lastDonationStmt->fetch(PDO::FETCH_ASSOC);
                            
                            if ($lastDonation) {
                                $lastDate = new DateTime($lastDonation['date']);
                                $now = new DateTime();
                                $daysSinceLastDonation = $now->diff($lastDate)->days;
                                $nextAvailableDate = clone $lastDate;
                                $nextAvailableDate->modify('+90 days');
                            }
                            ?>
                            
                            <div class="mt-3">
                                <div class="w-full <?php echo $isAvailable ? 'bg-emerald-600' : 'bg-red-600'; ?> text-white px-3 py-2 rounded modern-btn flex items-center justify-center gap-2 cursor-default">
                                    <?php echo $isAvailable ? '🟢 Available' : '🔴 Not Available'; ?>
                                    <i class="fas fa-robot text-sm" title="Automatically managed"></i>
                                </div>
                                
                                <div class="mt-2 text-xs text-gray-600 text-center">
                                    <?php if (!$isAvailable && $daysSinceLastDonation !== null): ?>
                                        <p><i class="fas fa-calendar-alt"></i> Available again on: <?php echo $nextAvailableDate->format('d M Y'); ?></p>
                                        <p><i class="fas fa-clock"></i> Days remaining: <?php echo max(0, 90 - $daysSinceLastDonation); ?></p>
                                    <?php elseif ($isAvailable && $daysSinceLastDonation !== null): ?>
                                        <p><i class="fas fa-check-circle"></i> Ready to donate again</p>
                                    <?php else: ?>
                                        <p><i class="fas fa-info-circle"></i> No donation history</p>
                                    <?php endif; ?>
                                    <p class="mt-1 text-gray-500"><i class="fas fa-cog"></i> Auto-managed based on donations</p>
                                </div>
                            </div>
                        </div>

                        <!-- Profile Complete/Complete Profile Card -->
                        <div class="lg:col-span-1 modern-card p-5">
                            <!-- Profile Section -->
                            <div class="text-center mb-6">
                                <?php if ($locationCompleted): ?>
                                <!-- Edit Profile Section -->
                                <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                                    <div class="flex items-center justify-center mb-4">
                                        <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                                            <i class="fas fa-user-edit text-white text-2xl"></i>
                                        </div>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800 mb-2">Profile Complete!</h3>
                                    <div class="text-sm text-gray-600 mb-4 space-y-1">
                                        <p><i class="fas fa-map-marker-alt text-green-600"></i> <?php echo htmlspecialchars($me['city'] ?? ''); ?>, <?php echo htmlspecialchars($me['district'] ?? ''); ?></p>
                                        <p><i class="fas fa-flag text-green-600"></i> <?php echo htmlspecialchars($me['state'] ?? ''); ?>, <?php echo htmlspecialchars($me['country'] ?? ''); ?></p>
                                    </div>
                                    <button id="edit-profile-btn" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3 mx-auto">
                                        <i class="fas fa-edit text-lg"></i>
                                        <span>Edit Your Profile</span>
                                        <i class="fas fa-arrow-right text-sm"></i>
                                    </button>
                                </div>
                                <?php else: ?>
                                <!-- Complete Profile Section -->
                                <div class="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
                                    <div class="flex items-center justify-center mb-4">
                                        <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                                            <i class="fas fa-user-plus text-white text-2xl"></i>
                                        </div>
                                    </div>
                                    <h3 class="text-lg font-bold text-gray-800 mb-2">Complete Your Profile</h3>
                                    <p class="text-gray-600 text-sm mb-4">Add your location details to help us serve you better</p>
                                    <button id="complete-profile-btn" class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3 mx-auto">
                                        <i class="fas fa-map-marker-alt text-lg"></i>
                                        <span>Complete Profile</span>
                                        <i class="fas fa-arrow-right text-sm"></i>
                                    </button>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <!-- Eligibility Countdown Card -->
                        <div class="lg:col-span-1 modern-card p-5 fade-in">
                            <h2 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="fas fa-hourglass-half text-red-600 text-xl"></i>
                                Eligibility Countdown
                            </h2>
                            <div id="eligibility-message" class="text-gray-700 text-lg font-medium" <?php if (!empty($history) && $daysRemaining > 0) echo 'data-timestamp="' . $nextEligibleTimestamp . '"'; ?>>
                                <?php echo htmlspecialchars($eligibilityMessage); ?>
                            </div>
                            <?php if (!empty($history) && $daysRemaining > 0): ?>
                            <div id="countdown-display" class="grid grid-cols-2 gap-2 mt-4">
                                <div class="text-center">
                                    <div class="bg-red-100 text-red-800 rounded-lg p-2">
                                        <div class="text-xl font-bold" id="days">0</div>
                                        <div class="text-xs">Days</div>
                                    </div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-red-100 text-red-800 rounded-lg p-2">
                                        <div class="text-xl font-bold" id="hours">0</div>
                                        <div class="text-xs">Hours</div>
                                    </div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-red-100 text-red-800 rounded-lg p-2">
                                        <div class="text-xl font-bold" id="minutes">0</div>
                                        <div class="text-xs">Minutes</div>
                                    </div>
                                </div>
                                <div class="text-center">
                                    <div class="bg-red-100 text-red-800 rounded-lg p-2">
                                        <div class="text-xl font-bold" id="seconds">0</div>
                                        <div class="text-xs">Seconds</div>
                                    </div>
                                </div>
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>




                    <script>
                        // Modal open/close handlers
                        const profileModal = document.getElementById('profile-modal');
                        const completeProfileBtn = document.getElementById('complete-profile-btn');
                        const editProfileBtn = document.getElementById('edit-profile-btn');
                        const profileModalClose = document.getElementById('profile-modal-close');
                        function openProfileModal() {
                            // Ensure modal is properly positioned for full-screen
                            profileModal.style.position = 'fixed';
                            profileModal.style.top = '0';
                            profileModal.style.left = '0';
                            profileModal.style.width = '100vw';
                            profileModal.style.height = '100vh';
                            profileModal.style.zIndex = '99998';
                            
                            profileModal.classList.remove('hidden');
                            
                            // Add smooth entrance animation
                            profileModal.style.opacity = '0';
                            profileModal.style.transform = 'scale(0.95)';
                            
                            // Trigger animation
                            requestAnimationFrame(() => {
                                profileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                                profileModal.style.opacity = '1';
                                profileModal.style.transform = 'scale(1)';
                            });
                            
                            // Prevent body scroll when modal is open
                            document.body.style.overflow = 'hidden';
                            document.documentElement.style.overflow = 'hidden';
                            
                            // Focus first input for better UX
                            setTimeout(() => {
                                const firstInput = profileModal.querySelector('input[name="name"]');
                                if (firstInput) {
                                    firstInput.focus();
                                }
                            }, 300);
                        }

                        function closeProfileModal() {
                            // Add smooth exit animation
                            profileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            profileModal.style.opacity = '0';
                            profileModal.style.transform = 'scale(0.95)';
                            
                            setTimeout(() => {
                                profileModal.classList.add('hidden');
                                // Restore body scroll when modal closes
                                document.body.style.overflow = '';
                                document.documentElement.style.overflow = '';
                                // Reset styles
                                profileModal.style.opacity = '';
                                profileModal.style.transform = '';
                                profileModal.style.transition = '';
                            }, 300);
                        }

                        // Event listeners
                        if (editProfileBtn) {
                            editProfileBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                openProfileModal();
                            });
                        }

                        if (profileModalClose) {
                            profileModalClose.addEventListener('click', closeProfileModal);
                        }

                        // Edit Profile Modal handlers
                        const editProfileCancel = document.getElementById('edit-profile-cancel');
                        if (editProfileCancel) {
                            editProfileCancel.addEventListener('click', function() {
                                closeProfileModal();
                            });
                        }

                        // Close modal on outside click
                        if (profileModal) {
                            profileModal.addEventListener('click', function(e) {
                                if (e.target === profileModal) {
                                    closeProfileModal();
                                }
                            });
                        }

                        // Close modal on ESC key
                        document.addEventListener('keydown', function(e) {
                            if (e.key === 'Escape' && profileModal && !profileModal.classList.contains('hidden')) {
                                closeProfileModal();
                            }
                        });

                        // Complete Profile Modal handlers
                        const completeProfileModal = document.getElementById('complete-profile-modal');
                        const completeProfileModalClose = document.getElementById('complete-profile-modal-close');
                        const completeProfileCancel = document.getElementById('complete-profile-cancel');

                        function openCompleteProfileModal() {
                            // Ensure modal is properly positioned
                            completeProfileModal.style.position = 'fixed';
                            completeProfileModal.style.top = '0';
                            completeProfileModal.style.left = '0';
                            completeProfileModal.style.width = '100vw';
                            completeProfileModal.style.height = '100vh';
                            completeProfileModal.style.zIndex = '99999';
                            
                            completeProfileModal.classList.remove('hidden');
                            
                            // Add smooth entrance animation
                            completeProfileModal.style.opacity = '0';
                            completeProfileModal.style.transform = 'scale(0.95)';
                            
                            // Trigger animation
                            requestAnimationFrame(() => {
                                completeProfileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                                completeProfileModal.style.opacity = '1';
                                completeProfileModal.style.transform = 'scale(1)';
                            });
                            
                            // Prevent body scroll when modal is open
                            document.body.style.overflow = 'hidden';
                            document.documentElement.style.overflow = 'hidden';
                            
                            // Focus first input for better UX
                            setTimeout(() => {
                                const firstInput = completeProfileModal.querySelector('input[name="name"]');
                                if (firstInput) {
                                    firstInput.focus();
                                }
                            }, 300);
                        }

                        function closeCompleteProfileModal() {
                            // Add smooth exit animation
                            completeProfileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            completeProfileModal.style.opacity = '0';
                            completeProfileModal.style.transform = 'scale(0.95)';
                            
                            setTimeout(() => {
                                completeProfileModal.classList.add('hidden');
                                // Restore body scroll when modal closes
                                document.body.style.overflow = '';
                                document.documentElement.style.overflow = '';
                                // Reset styles
                                completeProfileModal.style.opacity = '';
                                completeProfileModal.style.transform = '';
                                completeProfileModal.style.transition = '';
                            }, 300);
                        }

                        if (completeProfileBtn) {
                            completeProfileBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                openCompleteProfileModal();
                            });
                        }

                        if (completeProfileModalClose) {
                            completeProfileModalClose.addEventListener('click', closeCompleteProfileModal);
                        }

                        if (completeProfileCancel) {
                            completeProfileCancel.addEventListener('click', closeCompleteProfileModal);
                        }
                    </script>
                    <script>
                        // Dynamic phone validation based on country selection
                        function updatePhoneValidation(countrySelectId, phoneInputId, codeInputId = null) {
                            const countrySelect = document.getElementById(countrySelectId);
                            const phoneInput = document.getElementById(phoneInputId);
                            const codeInput = codeInputId ? document.getElementById(codeInputId) : null;
                            if (!countrySelect || !phoneInput) return;

                            const countryPhoneRules = {
                                'India': { code: '+91', phonePattern: '[6-9][0-9]{9}', placeholder: '9876543210', title: 'Enter 10 digits starting with 6-9' },
                                'Nepal': { code: '+977', phonePattern: '[1-9][0-9]{7,8}', placeholder: '12345678', title: 'Enter 8-9 digits starting with 1-9' },
                                'Sri Lanka': { code: '+94', phonePattern: '[0-9]{9}', placeholder: '712345678', title: 'Enter 9 digits' },
                                'Bangladesh': { code: '+880', phonePattern: '1[3-9][0-9]{8}', placeholder: '1712345678', title: 'Enter 10 digits starting with 1 and then 3-9' },
                                'Indonesia': { code: '+62', phonePattern: '[0-9]{9,12}', placeholder: '81234567890', title: 'Enter 9-12 digits' },
                                'Malaysia': { code: '+60', phonePattern: '[0-9]{9,10}', placeholder: '123456789', title: 'Enter 9-10 digits' },
                                'Vietnam': { code: '+84', phonePattern: '[0-9]{9,10}', placeholder: '912345678', title: 'Enter 9-10 digits' },
                                'Japan': { code: '+81', phonePattern: '[0-9]{9,10}', placeholder: '9012345678', title: 'Enter 9-10 digits' },
                                'United States': { code: '+1', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                                'United Kingdom': { code: '+44', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                                'Canada': { code: '+1', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                                'Australia': { code: '+61', phonePattern: '[0-9]{9}', placeholder: '412345678', title: 'Enter 9 digits' },
                                'Other': { code: '+1', phonePattern: '[0-9]{7,15}', placeholder: '1234567890', title: 'Enter digits only' }
                            };

                            function applyRule() {
                                const selectedCountry = countrySelect.value;
                                const rule = countryPhoneRules[selectedCountry] || countryPhoneRules['Other'];
                                phoneInput.pattern = rule.phonePattern;
                                phoneInput.placeholder = rule.placeholder;
                                phoneInput.title = rule.title;
                                if (codeInput) {
                                    codeInput.value = rule.code;
                                }
                            }

                            countrySelect.addEventListener('change', applyRule);
                            applyRule();
                        }

                        // Initialize phone validation for forms (if elements exist)
                        if (document.getElementById('country') && document.getElementById('phone')) {
                            updatePhoneValidation('country', 'phone');
                        }
                        if (document.getElementById('country-mandatory') && document.getElementById('mandatory-phone')) {
                            updatePhoneValidation('country-mandatory', 'mandatory-phone', 'mandatory-country-code');
                        }

                        // Unified country code update handler
                        function updateCountryCode(countrySelectId, codeInputId) {
                            const countrySelect = document.getElementById(countrySelectId);
                            const codeInput = document.getElementById(codeInputId);
                            
                            if (!countrySelect || !codeInput) return;
                            
                            const countryPhoneRules = {
                                'India': '+91',
                                'Nepal': '+977',
                                'Sri Lanka': '+94',
                                'Bangladesh': '+880',
                                'Indonesia': '+62',
                                'Malaysia': '+60',
                                'Vietnam': '+84',
                                'Japan': '+81',
                                'United States': '+1',
                                'United Kingdom': '+44',
                                'Canada': '+1',
                                'Australia': '+61'
                            };
                            
                            countrySelect.addEventListener('change', function() {
                                const country = this.value;
                                codeInput.value = countryPhoneRules[country] || '+1';
                            });
                        }

                        // Initialize country code handlers
                        updateCountryCode('edit-profile-country', 'edit-profile-country-code');
                        updateCountryCode('country-mandatory', 'mandatory-country-code');
                    </script>
                    
                    <script>
                        console.log('Script is running!');
                        
                        // Function to initialize modals
                        function initializeModals() {
                            console.log('Initializing modals...');
                            
                            // Modal open/close handlers
                            const profileModal = document.getElementById('profile-modal');
                            const completeProfileBtn = document.getElementById('complete-profile-btn');
                            const editProfileBtn = document.getElementById('edit-profile-btn');
                            const profileModalClose = document.getElementById('profile-modal-close');
                            
                            console.log('Elements found:');
                            console.log('profileModal:', profileModal);
                            console.log('editProfileBtn:', editProfileBtn);
                            console.log('profileModalClose:', profileModalClose);

                        function openProfileModal() {
                            console.log('openProfileModal called');
                            if (!profileModal) {
                                console.log('Profile modal element not found!');
                                return;
                            }
                            console.log('Profile modal element found, opening...');
                            
                            // Ensure modal is properly positioned for full-screen
                            profileModal.style.position = 'fixed';
                            profileModal.style.top = '0';
                            profileModal.style.left = '0';
                            profileModal.style.width = '100vw';
                            profileModal.style.height = '100vh';
                            profileModal.style.zIndex = '99998';
                            
                            profileModal.classList.remove('hidden');
                            
                            // Add smooth entrance animation
                            profileModal.style.opacity = '0';
                            profileModal.style.transform = 'scale(0.95)';
                            
                            // Trigger animation
                            requestAnimationFrame(() => {
                                profileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                                profileModal.style.opacity = '1';
                                profileModal.style.transform = 'scale(1)';
                            });
                            
                            // Prevent body scroll when modal is open
                            document.body.style.overflow = 'hidden';
                            document.documentElement.style.overflow = 'hidden';
                            
                            // Focus first input for better UX
                            setTimeout(() => {
                                const firstInput = profileModal.querySelector('input[name="name"]');
                                if (firstInput) {
                                    firstInput.focus();
                                }
                            }, 300);
                        }

                        function closeProfileModal() {
                            // Add smooth exit animation
                            profileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            profileModal.style.opacity = '0';
                            profileModal.style.transform = 'scale(0.95)';
                            
                            setTimeout(() => {
                                profileModal.classList.add('hidden');
                                // Restore body scroll when modal closes
                                document.body.style.overflow = '';
                                document.documentElement.style.overflow = '';
                                // Reset styles
                                profileModal.style.opacity = '';
                                profileModal.style.transform = '';
                                profileModal.style.transition = '';
                            }, 300);
                        }

                        // Complete Profile Modal handlers
                        const completeProfileModal = document.getElementById('complete-profile-modal');
                        const completeProfileModalClose = document.getElementById('complete-profile-modal-close');
                        const completeProfileCancel = document.getElementById('complete-profile-cancel');

                        function openCompleteProfileModal() {
                            // Ensure modal is properly positioned
                            completeProfileModal.style.position = 'fixed';
                            completeProfileModal.style.top = '0';
                            completeProfileModal.style.left = '0';
                            completeProfileModal.style.width = '100vw';
                            completeProfileModal.style.height = '100vh';
                            completeProfileModal.style.zIndex = '99999';
                            
                            completeProfileModal.classList.remove('hidden');
                            
                            // Add smooth entrance animation
                            completeProfileModal.style.opacity = '0';
                            completeProfileModal.style.transform = 'scale(0.95)';
                            
                            // Trigger animation
                            requestAnimationFrame(() => {
                                completeProfileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                                completeProfileModal.style.opacity = '1';
                                completeProfileModal.style.transform = 'scale(1)';
                            });
                            
                            // Prevent body scroll when modal is open
                            document.body.style.overflow = 'hidden';
                            document.documentElement.style.overflow = 'hidden';
                            
                            // Focus first input for better UX
                            setTimeout(() => {
                                const firstInput = completeProfileModal.querySelector('select[name="state"]');
                                if (firstInput) {
                                    firstInput.focus();
                                }
                            }, 300);
                        }

                        function closeCompleteProfileModal() {
                            // Add smooth exit animation
                            completeProfileModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            completeProfileModal.style.opacity = '0';
                            completeProfileModal.style.transform = 'scale(0.95)';
                            
                            setTimeout(() => {
                                completeProfileModal.classList.add('hidden');
                                // Restore body scroll when modal closes
                                document.body.style.overflow = '';
                                document.documentElement.style.overflow = '';
                                // Reset styles
                                completeProfileModal.style.opacity = '';
                                completeProfileModal.style.transform = '';
                                completeProfileModal.style.transition = '';
                            }, 300);
                        }

                        if (completeProfileBtn) {
                            completeProfileBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                openCompleteProfileModal();
                            });
                        }

                        if (editProfileBtn) {
                            console.log('Edit Profile Button found, adding event listener');
                            editProfileBtn.addEventListener('click', function(e) {
                                e.preventDefault();
                                console.log('Edit Profile Button clicked!');
                                openProfileModal();
                            });
                        } else {
                            console.log('Edit Profile Button NOT found!');
                        }

                        if (completeProfileModalClose) {
                            completeProfileModalClose.addEventListener('click', closeCompleteProfileModal);
                        }

                        if (completeProfileCancel) {
                            completeProfileCancel.addEventListener('click', closeCompleteProfileModal);
                        }

                        // Edit Profile Modal handlers
                        const editProfileCancel = document.getElementById('edit-profile-cancel');

                        if (editProfileCancel) {
                            editProfileCancel.addEventListener('click', function() {
                                closeProfileModal();
                            });
                        }

                        if (profileModalClose) {
                            profileModalClose.addEventListener('click', function() {
                                closeProfileModal();
                            });
                        }

                        // Close modal on outside click
                        if (profileModal) {
                            profileModal.addEventListener('click', function(e) {
                                if (e.target === profileModal) {
                                    closeProfileModal();
                                }
                            });
                        }

                        // Close modal on ESC key
                        document.addEventListener('keydown', function(e) {
                            if (e.key === 'Escape' && !profileModal.classList.contains('hidden')) {
                                closeProfileModal();
                            }
                        });

                        // Phone validation and country code update for modal form
                        function updatePhoneValidationModal() {
                            const countrySelect = document.getElementById('profile-country');
                            const phoneInput = document.getElementById('profile-phone');
                            const codeInput = document.getElementById('profile-country-code');

                            const countryPhoneRules = {
                                'India': { code: '+91', phonePattern: '[6-9][0-9]{9}', placeholder: '9876543210', title: 'Enter 10 digits starting with 6-9' },
                                'Nepal': { code: '+977', phonePattern: '[1-9][0-9]{7,8}', placeholder: '12345678', title: 'Enter 8-9 digits starting with 1-9' },
                                'Sri Lanka': { code: '+94', phonePattern: '[0-9]{9}', placeholder: '712345678', title: 'Enter 9 digits' },
                                'Bangladesh': { code: '+880', phonePattern: '1[3-9][0-9]{8}', placeholder: '1712345678', title: 'Enter 10 digits starting with 1 and then 3-9' },
                                'Indonesia': { code: '+62', phonePattern: '[0-9]{9,12}', placeholder: '81234567890', title: 'Enter 9-12 digits' },
                                'Malaysia': { code: '+60', phonePattern: '[0-9]{9,10}', placeholder: '123456789', title: 'Enter 9-10 digits' },
                                'Vietnam': { code: '+84', phonePattern: '[0-9]{9,10}', placeholder: '912345678', title: 'Enter 9-10 digits' },
                                'Japan': { code: '+81', phonePattern: '[0-9]{9,10}', placeholder: '9012345678', title: 'Enter 9-10 digits' },
                                'United States': { code: '+1', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                                'United Kingdom': { code: '+44', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                                'Canada': { code: '+1', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                                'Australia': { code: '+61', phonePattern: '[0-9]{9}', placeholder: '412345678', title: 'Enter 9 digits' },
                                'Other': { code: '+1', phonePattern: '[0-9]{7,15}', placeholder: '1234567890', title: 'Enter digits only' }
                            };

                            function applyRule() {
                                const selectedCountry = countrySelect.value;
                                const rule = countryPhoneRules[selectedCountry] || countryPhoneRules['Other'];
                                phoneInput.pattern = rule.phonePattern;
                                phoneInput.placeholder = rule.placeholder;
                                phoneInput.title = rule.title;
                                codeInput.value = rule.code;
                            }

                            countrySelect.addEventListener('change', applyRule);
                            applyRule();
                        }

                        updatePhoneValidationModal();

                        // Password visibility toggle function
                        function togglePasswordVisibility(inputId, iconId) {
                            const input = document.getElementById(inputId);
                            const icon = document.getElementById(iconId);
                            
                            if (input.type === 'password') {
                                input.type = 'text';
                                icon.classList.remove('fa-eye');
                                icon.classList.add('fa-eye-slash');
                            } else {
                                input.type = 'password';
                                icon.classList.remove('fa-eye-slash');
                                icon.classList.add('fa-eye');
                            }
                        }

                        // Update country code for edit profile modal
                        document.getElementById('edit-profile-country').addEventListener('change', function() {
                            const country = this.value;
                            const countryPhoneRules = {
                                'India': '+91',
                                'Nepal': '+977',
                                'Sri Lanka': '+94',
                                'Bangladesh': '+880',
                                'Indonesia': '+62',
                                'Malaysia': '+60',
                                'Vietnam': '+84',
                                'Japan': '+81',
                                'United States': '+1',
                                'United Kingdom': '+44',
                                'Canada': '+1',
                                'Australia': '+61'
                            };
                            const codeInput = document.getElementById('edit-profile-country-code');
                            if (codeInput) {
                                if (countryPhoneRules[country]) {
                                    codeInput.value = countryPhoneRules[country];
                                } else {
                                    codeInput.value = '+1';
                                }
                            }
                        });

                        // Close modals on outside click
                        completeProfileModal.addEventListener('click', function(e) {
                            if (e.target === completeProfileModal) {
                                closeCompleteProfileModal();
                            }
                        });

                        // Close modals on Escape key
                        document.addEventListener('keydown', function(e) {
                            if (e.key === 'Escape') {
                                if (!profileModal.classList.contains('hidden')) {
                                    closeProfileModal();
                                }
                                if (!completeProfileModal.classList.contains('hidden')) {
                                    closeCompleteProfileModal();
                                }
                            }
                        });
                        
                        } // End of initializeModals function
                        
                        // Try to initialize immediately if DOM is already loaded
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', initializeModals);
                        } else {
                            // DOM is already loaded
                            initializeModals();
                        }
                    </script>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6 mt-6">
                        <div class="modern-card p-5">
                            <h2 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="fas fa-tint text-red-600 text-xl"></i>
                                Donation History
                                <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full"><?php echo count($history); ?> donations</span>
                            </h2>
                            <?php if (empty($history)): ?>
                                <div class="text-center py-8">
                                    <i class="fas fa-heart text-gray-300 text-4xl mb-3"></i>
                                    <p class="text-gray-500">No donations recorded yet.</p>
                                    <p class="text-sm text-gray-400 mt-1">Your first donation will appear here</p>
                                </div>
                            <?php else: ?>
                                <div class="space-y-3 max-h-64 overflow-y-auto">
                                    <?php foreach ($history as $h): ?>
                                    <div class="bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                                    <i class="fas fa-tint text-white text-xs"></i>
                                                </div>
                                                <div>
                                                    <p class="font-medium text-gray-900"><?php echo date('d-m-Y', strtotime($h['date'])); ?></p>
                                                    <p class="text-sm text-gray-600"><?php echo htmlspecialchars($h['notes'] ?? 'No notes'); ?></p>
                                                </div>
                                            </div>
                                            <div class="text-right flex flex-col items-end gap-1">
                                                <span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                                    <?php echo htmlspecialchars($h['units']); ?> unit<?php echo $h['units'] > 1 ? 's' : ''; ?>
                                                </span>
                                                <div class="flex gap-1">
                                                    <button onclick="editDonation(<?php echo $h['id']; ?>, '<?php echo htmlspecialchars($h['date']); ?>', <?php echo $h['units']; ?>, '<?php echo htmlspecialchars($h['notes'] ?? ''); ?>')" class="text-blue-600 hover:text-blue-800 text-sm" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button onclick="deleteItem('donation', <?php echo $h['id']; ?>)" class="text-red-600 hover:text-red-800 text-sm" title="Delete">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                            <!-- Enhanced Record New Donation Section -->
                            <div class="mt-6 pt-6 border-t-2 border-gray-100">
                                <div class="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100 relative overflow-hidden">
                                    <!-- Background decoration -->
                                    <div class="absolute top-0 right-0 w-20 h-20 bg-red-200 rounded-full opacity-20 translate-x-10 -translate-y-10"></div>
                                    
                                    <div class="relative z-10">
                                        <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                            <div class="w-10 h-10 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                                                <i class="fas fa-plus-circle text-white"></i>
                                            </div>
                                            Record New Donation
                                            <div class="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                                        </h3>
                                        
                                        <form method="post" class="space-y-6">
                                            <input type="hidden" name="action" value="add_donation">
                                            
                                            <div class="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                        <i class="fas fa-tint text-red-500"></i>
                                                        Units Donated *
                                                    </label>
                                                    <div class="relative">
                                                        <input class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white" type="number" name="units" value="1" step="0.01" min="0.1" max="10" required style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                                        <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                            <i class="fas fa-tint text-red-500"></i>
                                                        </div>
                                                        <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                            <span class="text-sm text-gray-500 font-medium">units</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                        <i class="fas fa-calendar text-red-500"></i>
                                                        Donation Date *
                                                    </label>
                                                    <div class="relative">
                                                        <input class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white" type="date" name="donation_date" value="<?php echo date('Y-m-d'); ?>" min="<?php echo !empty($me['dob']) ? date('Y-m-d', strtotime($me['dob'] . ' +18 years')) : date('Y-m-d', strtotime('-18 years')); ?>" max="<?php echo date('Y-m-d'); ?>" required style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                                        <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                            <i class="fas fa-calendar text-red-500"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <i class="fas fa-sticky-note text-red-500"></i>
                                                    Notes (Optional)
                                                </label>
                                                <div class="relative">
                                                    <textarea class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white resize-none" name="notes" rows="1" placeholder="e.g., Emergency donation, Regular checkup" style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;"></textarea>
                                                    <div class="absolute top-4 left-4 flex items-center pointer-events-none">
                                                        <i class="fas fa-sticky-note text-red-500"></i>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button class="w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors duration-200 shadow-xl flex items-center justify-center gap-3 relative overflow-hidden">
                                                <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
                                                <i class="fas fa-heart text-xl animate-pulse"></i>
                                                Record Donation
                                                <i class="fas fa-arrow-right text-lg"></i>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="modern-card p-5">
                            <h2 class="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="fas fa-bell text-yellow-600 text-xl"></i>
                                Donation Reminders
                                <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full"><?php echo count($rem); ?> active</span>
                            </h2>
                            <?php if (empty($rem)): ?>
                                <div class="text-center py-8">
                                    <i class="fas fa-calendar-alt text-gray-300 text-4xl mb-3"></i>
                                    <p class="text-gray-500">No reminders set.</p>
                                    <p class="text-sm text-gray-400 mt-1">Set reminders to stay on track</p>
                                </div>
                            <?php else: ?>
                                <div class="space-y-3 max-h-64 overflow-y-auto">
                                    <?php
                                    $today = date('Y-m-d');
                                    foreach ($rem as $r):
                                        $reminderDate = $r['reminder_date'];
                                        $isPast = $reminderDate < $today;
                                        $isToday = $reminderDate == $today;
                                        $isFuture = $reminderDate > $today;
                                        $statusClass = $isPast ? 'bg-red-100 text-red-800' : ($isToday ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800');
                                        $statusIcon = $isPast ? 'fas fa-exclamation-triangle' : ($isToday ? 'fas fa-clock' : 'fas fa-calendar-check');
                                        $statusText = $isPast ? 'Overdue' : ($isToday ? 'Today' : 'Upcoming');
                                    ?>
                                    <div class="border rounded-lg p-3 hover:shadow-sm transition-shadow <?php echo $isPast ? 'border-red-200 bg-red-50' : ($isToday ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'); ?>">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 <?php echo $isPast ? 'bg-red-600' : ($isToday ? 'bg-yellow-600' : 'bg-blue-600'); ?> rounded-full flex items-center justify-center">
                                                    <i class="<?php echo $statusIcon; ?> text-white text-xs"></i>
                                                </div>
                                                <div>
                                                    <p class="font-medium text-gray-900"><?php echo htmlspecialchars($r['message']); ?></p>
                                                    <p class="text-sm text-gray-600"><?php echo date('d-m-Y', strtotime($r['reminder_date'])); ?></p>
                                                </div>
                                            </div>
                                            <div class="flex flex-col items-end gap-1">
                                                <span class="text-xs font-medium px-2 py-1 rounded-full <?php echo $statusClass; ?>">
                                                    <?php echo $statusText; ?>
                                                </span>
                                                <div class="flex gap-1">
                                                    <button onclick="editReminder(<?php echo $r['id']; ?>, '<?php echo htmlspecialchars($r['reminder_date']); ?>', '<?php echo htmlspecialchars($r['message']); ?>')" class="text-blue-600 hover:text-blue-800 text-sm" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button onclick="deleteItem('reminder', <?php echo $r['id']; ?>)" class="text-red-600 hover:text-red-800 text-sm" title="Delete">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                            <!-- Enhanced Set New Reminder Section -->
                            <div class="mt-6 pt-6 border-t-2 border-gray-100">
                                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 relative overflow-hidden">
                                    <!-- Background decoration -->
                                    <div class="absolute top-0 left-0 w-20 h-20 bg-blue-200 rounded-full opacity-20 -translate-x-10 -translate-y-10"></div>
                                    
                                    <div class="relative z-10">
                                        <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                                <i class="fas fa-plus-circle text-white"></i>
                                            </div>
                                            Set New Reminder
                                            <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                        </h3>
                                        
                                        <form method="post" class="space-y-6">
                                            <input type="hidden" name="action" value="add_reminder">
                                            
                                            <div>
                                                <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <i class="fas fa-calendar-plus text-blue-500"></i>
                                                    Reminder Date *
                                                </label>
                                                <div class="relative">
                                                    <input class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white" type="date" name="reminder_date" min="<?php echo date('Y-m-d'); ?>" required style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                                    <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                        <i class="fas fa-calendar-plus text-blue-500"></i>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <i class="fas fa-comment-dots text-blue-500"></i>
                                                    Reminder Message *
                                                </label>
                                                <div class="relative">
                                                    <input class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white" type="text" name="reminder_text" placeholder="e.g., Time for your next donation" required style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                                    <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                        <i class="fas fa-comment-dots text-blue-500"></i>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button class="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors duration-200 shadow-xl flex items-center justify-center gap-3 relative overflow-hidden">
                                                <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
                                                <i class="fas fa-bell text-xl animate-pulse"></i>
                                                Set Reminder
                                                <i class="fas fa-arrow-right text-lg"></i>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Search Donors moved to index.php -->

                    <!-- Modal for showing content sections -->
        </div>



        <!-- Modal for showing content sections -->
        <div id="rs-info-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative p-8 border border-red-600">
                <button id="rs-info-close" aria-label="Close modal" class="absolute top-4 right-4 text-gray-600 hover:text-red-600 focus:outline-none transition-colors duration-300">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div id="rs-info-content" class="prose max-w-none text-gray-800"></div>
            </div>
        </div>

        <!-- Edit Donation Modal -->
        <div id="edit-donation-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-lg font-bold mb-4">Edit Donation</h3>
                <form id="edit-donation-form" method="post">
                    <input type="hidden" name="action" value="edit_donation">
                    <input type="hidden" name="donation_id" id="edit-donation-id">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Date</label>
                        <input type="date" name="donation_date" id="edit-donation-date" class="w-full border rounded px-3 py-2" min="<?php echo !empty($me['dob']) ? date('Y-m-d', strtotime($me['dob'] . ' +18 years')) : date('Y-m-d', strtotime('-18 years')); ?>" max="<?php echo date('Y-m-d'); ?>" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Units</label>
                        <input type="number" name="units" id="edit-donation-units" step="0.01" min="0.1" max="10" class="w-full border rounded px-3 py-2" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Notes</label>
                        <input type="text" name="notes" id="edit-donation-notes" class="w-full border rounded px-3 py-2">
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                        <button type="button" onclick="closeModal('edit-donation-modal')" class="bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Edit Reminder Modal -->
        <div id="edit-reminder-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-lg font-bold mb-4">Edit Reminder</h3>
                <form id="edit-reminder-form" method="post">
                    <input type="hidden" name="action" value="edit_reminder">
                    <input type="hidden" name="reminder_id" id="edit-reminder-id">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Date</label>
                        <input type="date" name="reminder_date" id="edit-reminder-date" class="w-full border rounded px-3 py-2" required>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-1">Message</label>
                        <input type="text" name="reminder_text" id="edit-reminder-text" class="w-full border rounded px-3 py-2" required>
                    </div>
                    <div class="flex gap-2">
                        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                        <button type="button" onclick="closeModal('edit-reminder-modal')" class="bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Profile Picture Upload Modal -->
        <div id="profile-picture-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <i class="fas fa-camera text-2xl"></i>
                            </div>
                            <div>
                                <h3 class="text-xl font-bold">Profile Picture</h3>
                                <p class="text-blue-100 text-sm">Upload your photo</p>
                            </div>
                        </div>
                        <button onclick="closeProfilePictureModal()" class="text-white hover:text-red-200 transition-colors">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    <!-- Current Profile Picture Preview -->
                    <div class="text-center mb-6">
                        <div class="relative inline-block">
                            <?php if (!empty($me['profile_picture']) && file_exists(__DIR__ . '/' . $me['profile_picture'])): ?>
                                <img id="current-profile-preview" src="<?php echo htmlspecialchars($me['profile_picture']); ?>" alt="Current Profile" class="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-gray-200">
                            <?php else: ?>
                                <div id="current-profile-preview" class="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    <?php echo strtoupper(substr($me['full_name'], 0, 1)); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                        <p class="text-gray-600 text-sm mt-2">Current Profile Picture</p>
                    </div>

                    <!-- Upload Form -->
                    <form method="post" enctype="multipart/form-data" class="space-y-4">
                        <input type="hidden" name="action" value="upload_profile_picture">
                        
                        <!-- File Upload Area -->
                        <div id="drop-zone" class="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                            <div class="space-y-3">
                                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <i class="fas fa-cloud-upload-alt text-blue-600 text-2xl"></i>
                                </div>
                                <div>
                                    <label for="profile_picture" class="cursor-pointer">
                                        <span class="text-blue-600 font-semibold hover:text-blue-700">Choose a file</span>
                                        <span class="text-gray-600"> or drag and drop</span>
                                    </label>
                                    <input type="file" id="profile_picture" name="profile_picture" accept=".jpg,.jpeg,.png" class="hidden" onchange="previewImage(this)">
                                </div>
                                <p class="text-xs text-gray-500">JPG, JPEG or PNG (Max 5MB)</p>
                            </div>
                        </div>

                        <!-- Image Preview -->
                        <div id="image-preview" class="hidden text-center">
                            <img id="preview-img" class="w-32 h-32 rounded-full object-cover mx-auto shadow-lg border-4 border-blue-200">
                            <p class="text-green-600 text-sm mt-2 font-medium">
                                <i class="fas fa-check-circle"></i> Ready to upload
                            </p>
                        </div>

                        <!-- Upload Progress -->
                        <div id="upload-progress" class="hidden">
                            <div class="bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                            <p class="text-center text-sm text-gray-600 mt-2">Uploading...</p>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-3 pt-4">
                            <button type="submit" class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2">
                                <i class="fas fa-upload"></i>
                                Upload Picture
                            </button>
                            <button type="button" onclick="closeProfilePictureModal()" class="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                        </div>

                        <!-- Remove Picture Option -->
                        <?php if (!empty($me['profile_picture'])): ?>
                        <div class="pt-4 border-t border-gray-200">
                            <button type="button" onclick="removeProfilePicture()" class="w-full text-red-600 hover:text-red-700 py-2 text-sm font-medium flex items-center justify-center gap-2">
                                <i class="fas fa-trash"></i>
                                Remove Current Picture
                            </button>
                        </div>
                        <?php endif; ?>
                    </form>
                </div>
            </div>
        </div>

        <!-- Content sections linked from sidebar -->
        <section id="about" class="rs-section hidden modern-card p-6 mt-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <i class="fas fa-info-circle text-red-600 text-2xl"></i>
                About Us
            </h2>
            <div class="grid sm:grid-cols-2 gap-6 text-gray-700">
                <div class="flex items-start gap-4">
                    <i class="fas fa-user-plus text-red-600 text-3xl mt-1"></i>
                    <div>
                        <h3 class="font-semibold text-lg mb-1">Easy Donor Registration</h3>
                        <p>Quick and simple sign-up process for blood donors.</p>
                    </div>
                </div>
                <div class="flex items-start gap-4">
                    <i class="fas fa-search text-red-600 text-3xl mt-1"></i>
                    <div>
                        <h3 class="font-semibold text-lg mb-1">Real-time Donor Search</h3>
                        <p>Find available donors based on blood type and location instantly.</p>
                    </div>
                </div>
                <div class="flex items-start gap-4">
                    <i class="fas fa-bell text-red-600 text-3xl mt-1"></i>
                    <div>
                        <h3 class="font-semibold text-lg mb-1">Donation Reminders</h3>
                        <p>Automated reminders to help donors maintain regular donations.</p>
                    </div>
                </div>
                <div class="flex items-start gap-4">
                    <i class="fas fa-history text-red-600 text-3xl mt-1"></i>
                    <div>
                        <h3 class="font-semibold text-lg mb-1">Donation History Tracking</h3>
                        <p>Keep track of your past donations and contributions.</p>
                    </div>
                </div>
                <div class="flex items-start gap-4">
                    <i class="fas fa-mobile-alt text-red-600 text-3xl mt-1"></i>
                    <div>
                        <h3 class="font-semibold text-lg mb-1">Mobile Friendly</h3>
                        <p>Access the platform anytime, anywhere on any device.</p>
                    </div>
                </div>
                <div class="flex items-start gap-4">
                    <i class="fas fa-users text-red-600 text-3xl mt-1"></i>
                    <div>
                        <h3 class="font-semibold text-lg mb-1">Community Support</h3>
                        <p>Join a compassionate community dedicated to saving lives.</p>
                    </div>
                </div>
            </div>
        </section>
        <section id="vision" class="rs-section hidden modern-card p-6 mt-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <i class="fas fa-eye text-red-600 text-2xl"></i>
                Vision & Mission
            </h2>
            <div class="space-y-6 text-gray-700">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-3">
                        <i class="fas fa-eye text-blue-600"></i>
                        Vision
                    </h3>
                    <p class="mb-2">Friends2Support vision is to pave way for a safer and better tomorrow.</p>
                    <ul class="list-disc pl-5 space-y-1">
                        <li><strong>Safer</strong>: by bringing blood donors and those in need to a common platform.</li>
                        <li><strong>Better</strong>: by providing every person what he/she deserves the most — best education.</li>
                    </ul>
                    <p class="mt-3 font-medium">Our aim in the next 5 years:</p>
                    <ul class="list-disc pl-5 space-y-1">
                        <li>To be the real hope of every Indian in search of a voluntary blood donor.</li>
                        <li>To set up a well‑organised infrastructure across the country to cater to the education of the under‑resourced by maintaining a repository of contributed books and providing as many resources as possible for rural child education.</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-3">
                        <i class="fas fa-bullseye text-green-600"></i>
                        Mission
                    </h3>
                    <ul class="list-disc pl-5 space-y-1">
                        <li>To make the best use of contemporary technologies in delivering a promising web portal to bring together all the blood donors in India; thereby fulfilling every blood request in the country.</li>
                        <li>To provide a common platform for those who have a zeal to support education of the under‑resourced yet meritorious students.</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-3">
                        <i class="fas fa-star text-purple-600"></i>
                        Values
                    </h3>
                    <ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 list-disc pl-5">
                        <li>Dignity</li>
                        <li>Excellence</li>
                        <li>Diversity</li>
                        <li>Individual and teamwork</li>
                        <li>Compassion</li>
                        <li>Advance</li>
                        <li>Trust</li>
                        <li>Integrity</li>
                        <li>Oblige</li>
                        <li>Network</li>
                    </ul>
                </div>
            </div>
        </section>
        <section id="founders" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-user-tie text-red-600 text-xl"></i>
                Founders
            </h3>
            <div class="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Delvin Varghese</div>
                    <div class="text-sm text-gray-600">Kerala, India</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:delvinvarghese2028@mca.ajce.in">delvinvarghese2028@mca.ajce.in</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Melbin James</div>
                    <div class="text-sm text-gray-600">Kerala, India</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:melbinjames2028@mca.ajce.in">melbinjames2028@mca.ajce.in</a>
                </div>
            </div>
        </section>
        <section id="tech" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-code text-red-600 text-xl"></i>
                Technical Team
            </h3>
            <div class="grid sm:grid-cols-3 lg:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Alice Smith</div>
                    <div class="text-sm text-gray-600">Bangalore</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:alice@example.com">alice@example.com</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Bob Johnson</div>
                    <div class="text-sm text-gray-600">Chennai</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:bob@example.com">bob@example.com</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Charlie Lee</div>
                    <div class="text-sm text-gray-600">Delhi</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:charlie@example.com">charlie@example.com</a>
                </div>
            </div>
        </section>
        <section id="volunteers" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-hands-helping text-red-600 text-xl"></i>
                Field Volunteers
            </h3>
            <div class="grid sm:grid-cols-3 lg:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">David Kim</div>
                    <div class="text-sm text-gray-600">Pune</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:david@example.com">david@example.com</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Eva Green</div>
                    <div class="text-sm text-gray-600">Kolkata</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:eva@example.com">eva@example.com</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Frank Moore</div>
                    <div class="text-sm text-gray-600">Ahmedabad</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:frank@example.com">frank@example.com</a>
                </div>
            </div>
        </section>
        <section id="campaign" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-bullhorn text-red-600 text-xl"></i>
                Campaign Team
            </h3>
            <div class="grid sm:grid-cols-3 lg:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Grace Hall</div>
                    <div class="text-sm text-gray-600">Chennai</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:grace@example.com">grace@example.com</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Henry Adams</div>
                    <div class="text-sm text-gray-600">Mumbai</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:henry@example.com">henry@example.com</a>
                </div>
                <div class="p-4 rounded-xl border bg-white flex flex-col items-center text-center">
                    <i class="fas fa-user-circle text-gray-400 text-5xl mb-2"></i>
                    <div class="font-semibold text-gray-800">Isabel Clark</div>
                    <div class="text-sm text-gray-600">Bangalore</div>
                    <a class="text-sm text-blue-600 underline" href="mailto:isabel@example.com">isabel@example.com</a>
                </div>
            </div>
        </section>
        <section id="facts" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-book-open text-red-600 text-xl"></i>
                Blood Donation Facts
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Blood donation is a voluntary procedure that can save lives. Here are some important facts:</p>
                <ul class="list-disc pl-5 space-y-1">
                    <li>Every 2 seconds, someone in the world needs blood.</li>
                    <li>One donation can save up to three lives.</li>
                    <li>Blood cannot be manufactured; it can only come from generous donors.</li>
                    <li>Blood donation is safe and takes about 10-15 minutes.</li>
                    <li>Regular donors are encouraged to donate every 3-4 months.</li>
                    <li>Blood types are important for compatibility in transfusions.</li>
                    <li>Donating blood can improve cardiovascular health and reduce harmful iron stores.</li>
                    <li>Donors should eat a healthy meal and stay hydrated before donating.</li>
                    <li>Blood donation centers follow strict safety and hygiene protocols.</li>
                </ul>
                <p>By donating blood, you contribute to saving lives and supporting healthcare systems worldwide.</p>
            </div>
        </section>
        <section id="who-can" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-check-circle text-red-600 text-xl"></i>
                Who can/ Can't Donate
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Eligibility criteria for blood donation include:</p>
                <ul class="list-disc pl-5 space-y-1">
                    <li>Age between 18 and 65 years.</li>
                    <li>Weight above 50 kg.</li>
                    <li>Good general health and feeling well on the day of donation.</li>
                    <li>No recent infections or illnesses.</li>
                    <li>Not pregnant or breastfeeding.</li>
                    <li>No history of certain medical conditions or risk factors.</li>
                    <li>Not taken certain medications or vaccines recently.</li>
                    <li>Not engaged in high-risk behaviors that increase infection risk.</li>
                    <li>At least 3 months since last donation for whole blood donors.</li>
                </ul>
                <p>People who do not meet these criteria should consult a healthcare professional before donating.</p>
            </div>
        </section>

        <!-- Additional Blood Donation Content Sections -->
        <section id="donation-process" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-route text-red-600 text-xl"></i>
                Donation Process
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>The blood donation process is simple and safe. Here's what to expect:</p>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <h4 class="font-semibold text-red-600">Before Donation:</h4>
                        <ul class="list-disc pl-5 space-y-1">
                            <li>Registration and health screening</li>
                            <li>Medical history questionnaire</li>
                            <li>Mini physical examination</li>
                            <li>Hemoglobin level check</li>
                        </ul>
                    </div>
                    <div class="space-y-3">
                        <h4 class="font-semibold text-red-600">During Donation:</h4>
                        <ul class="list-disc pl-5 space-y-1">
                            <li>Comfortable seating in donation chair</li>
                            <li>Arm cleaning and needle insertion</li>
                            <li>10-15 minutes of blood collection</li>
                            <li>Approximately 450ml of blood collected</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section id="blood-types" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-tint text-red-600 text-xl"></i>
                Blood Types Guide
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Understanding blood types is crucial for safe transfusions:</p>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-red-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-red-600 mb-3">Universal Donors & Recipients:</h4>
                        <ul class="space-y-2">
                            <li><strong>O-:</strong> Universal donor (can donate to all)</li>
                            <li><strong>AB+:</strong> Universal recipient (can receive from all)</li>
                            <li><strong>O+:</strong> Can donate to all positive types</li>
                            <li><strong>AB-:</strong> Can receive from all negative types</li>
                        </ul>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-blue-600 mb-3">Blood Type Distribution:</h4>
                        <ul class="space-y-2">
                            <li><strong>O+:</strong> 38% of population</li>
                            <li><strong>A+:</strong> 34% of population</li>
                            <li><strong>B+:</strong> 9% of population</li>
                            <li><strong>AB+:</strong> 3% of population</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section id="health-benefits" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-heart text-red-600 text-xl"></i>
                Health Benefits of Donating Blood
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Blood donation offers several health benefits for donors:</p>
                <div class="grid md:grid-cols-3 gap-4">
                    <div class="bg-green-50 p-4 rounded-lg">
                        <i class="fas fa-heartbeat text-green-600 text-2xl mb-2"></i>
                        <h4 class="font-semibold mb-2">Cardiovascular Health</h4>
                        <p class="text-sm">Regular donation helps maintain healthy iron levels and reduces cardiovascular disease risk.</p>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <i class="fas fa-search text-blue-600 text-2xl mb-2"></i>
                        <h4 class="font-semibold mb-2">Free Health Screening</h4>
                        <p class="text-sm">Each donation includes checks for blood pressure, pulse, temperature, and hemoglobin.</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <i class="fas fa-smile text-purple-600 text-2xl mb-2"></i>
                        <h4 class="font-semibold mb-2">Mental Wellness</h4>
                        <p class="text-sm">Helping others creates a sense of purpose and psychological well-being.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="preparation-tips" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-clipboard-list text-red-600 text-xl"></i>
                Preparation Tips
            </h3>
            <div class="space-y-4 text-gray-700">
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold text-red-600 mb-3">Before Donation:</h4>
                        <ul class="list-disc pl-5 space-y-1">
                            <li>Get a good night's sleep (7-8 hours)</li>
                            <li>Eat a healthy meal 3 hours before</li>
                            <li>Drink plenty of water (16-20 oz)</li>
                            <li>Avoid fatty foods</li>
                            <li>Bring valid ID and donor card</li>
                            <li>Wear comfortable clothing</li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-semibold text-red-600 mb-3">What to Avoid:</h4>
                        <ul class="list-disc pl-5 space-y-1">
                            <li>Alcohol 24 hours before</li>
                            <li>Smoking 2 hours before</li>
                            <li>Heavy exercise before donation</li>
                            <li>Aspirin 48 hours before</li>
                            <li>Coming on empty stomach</li>
                            <li>Tight-fitting sleeves</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section id="aftercare" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-shield-alt text-red-600 text-xl"></i>
                Post-Donation Care
            </h3>
            <div class="space-y-4 text-gray-700">
                <div class="bg-yellow-50 p-4 rounded-lg mb-4">
                    <h4 class="font-semibold text-yellow-700 mb-2">⚠️ Immediate Care (First 24 hours):</h4>
                    <ul class="list-disc pl-5 space-y-1">
                        <li>Keep bandage on for 4-6 hours</li>
                        <li>Avoid heavy lifting with donation arm</li>
                        <li>Drink extra fluids (non-alcoholic)</li>
                        <li>Eat iron-rich foods</li>
                        <li>Rest if feeling lightheaded</li>
                    </ul>
                </div>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-green-600 mb-2">✅ Do:</h4>
                        <ul class="text-sm space-y-1">
                            <li>• Drink 16-20 oz of fluids</li>
                            <li>• Eat a snack</li>
                            <li>• Take it easy</li>
                            <li>• Apply ice if bruising occurs</li>
                        </ul>
                    </div>
                    <div class="bg-red-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-red-600 mb-2">❌ Don't:</h4>
                        <ul class="text-sm space-y-1">
                            <li>• Remove bandage early</li>
                            <li>• Do strenuous exercise</li>
                            <li>• Drink alcohol</li>
                            <li>• Smoke for 30 minutes</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section id="myths-facts" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-lightbulb text-red-600 text-xl"></i>
                Myths vs Facts
            </h3>
            <div class="space-y-4">
                <div class="grid gap-4">
                    <div class="bg-red-50 border-l-4 border-red-500 p-4">
                        <h4 class="font-semibold text-red-600 mb-2">❌ Myth: Blood donation makes you weak</h4>
                        <p class="text-gray-700">✅ <strong>Fact:</strong> Your body replaces the donated blood within 24-48 hours. The slight temporary decrease doesn't affect your strength.</p>
                    </div>
                    <div class="bg-red-50 border-l-4 border-red-500 p-4">
                        <h4 class="font-semibold text-red-600 mb-2">❌ Myth: You can get infected from donating</h4>
                        <p class="text-gray-700">✅ <strong>Fact:</strong> All equipment is sterile and single-use. There's zero risk of infection from donating blood.</p>
                    </div>
                    <div class="bg-red-50 border-l-4 border-red-500 p-4">
                        <h4 class="font-semibold text-red-600 mb-2">❌ Myth: Donation is painful</h4>
                        <p class="text-gray-700">✅ <strong>Fact:</strong> You'll feel a brief pinch during needle insertion, similar to a routine blood test.</p>
                    </div>
                    <div class="bg-red-50 border-l-4 border-red-500 p-4">
                        <h4 class="font-semibold text-red-600 mb-2">❌ Myth: You need to be a certain blood type</h4>
                        <p class="text-gray-700">✅ <strong>Fact:</strong> All blood types are needed and valuable. Every donation can save up to 3 lives.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="emergency-blood" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-ambulance text-red-600 text-xl"></i>
                Emergency Blood Need
            </h3>
            <div class="space-y-4 text-gray-700">
                <div class="bg-red-100 border border-red-300 p-4 rounded-lg">
                    <h4 class="font-semibold text-red-700 mb-2">🚨 Critical Blood Shortage Alert</h4>
                    <p>Blood banks need constant supply as blood has limited shelf life:</p>
                </div>
                <div class="grid md:grid-cols-3 gap-4">
                    <div class="text-center bg-gray-50 p-4 rounded-lg">
                        <i class="fas fa-tint text-red-600 text-3xl mb-2"></i>
                        <h4 class="font-semibold">Red Blood Cells</h4>
                        <p class="text-sm text-gray-600">42 days shelf life</p>
                    </div>
                    <div class="text-center bg-gray-50 p-4 rounded-lg">
                        <i class="fas fa-circle text-yellow-500 text-3xl mb-2"></i>
                        <h4 class="font-semibold">Platelets</h4>
                        <p class="text-sm text-gray-600">5 days shelf life</p>
                    </div>
                    <div class="text-center bg-gray-50 p-4 rounded-lg">
                        <i class="fas fa-flask text-blue-600 text-3xl mb-2"></i>
                        <h4 class="font-semibold">Plasma</h4>
                        <p class="text-sm text-gray-600">1 year shelf life</p>
                    </div>
                </div>
                <p><strong>Every 2 seconds</strong> someone in India needs blood. Your donation can be the difference between life and death.</p>
            </div>
        </section>

        <section id="donation-centers" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-map-marker-alt text-red-600 text-xl"></i>
                Nearby Donation Centers
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Find blood donation centers near you:</p>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-blue-600 mb-2">🏥 Government Centers</h4>
                        <ul class="space-y-1 text-sm">
                            <li>• District Government Hospital</li>
                            <li>• Regional Blood Transfusion Center</li>
                            <li>• Primary Health Centers</li>
                            <li>• Medical College Blood Banks</li>
                        </ul>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-green-600 mb-2">🏢 Private Centers</h4>
                        <ul class="space-y-1 text-sm">
                            <li>• Red Cross Blood Banks</li>
                            <li>• Private Hospital Blood Banks</li>
                            <li>• NGO Blood Collection Centers</li>
                            <li>• Mobile Blood Donation Camps</li>
                        </ul>
                    </div>
                </div>
                <div class="bg-yellow-50 p-4 rounded-lg">
                    <p class="text-sm"><strong>💡 Tip:</strong> Call ahead to confirm timings and availability. Many centers also organize mobile camps in your area.</p>
                </div>
            </div>
        </section>


        <!-- Additional Blood Donation Content Sections -->
        <section id="blood-drives" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-calendar-alt text-red-600 text-xl"></i>
                Blood Drives & Events
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Join upcoming blood donation drives and community events:</p>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 class="font-semibold text-blue-600 mb-3">📅 Upcoming Events</h4>
                        <div class="space-y-3">
                            <div class="bg-white p-3 rounded border-l-4 border-blue-500">
                                <h5 class="font-medium">Community Blood Drive</h5>
                                <p class="text-sm text-gray-600">📍 City Community Center</p>
                                <p class="text-sm text-gray-600">🕒 January 15, 2026 | 9:00 AM - 5:00 PM</p>
                            </div>
                            <div class="bg-white p-3 rounded border-l-4 border-green-500">
                                <h5 class="font-medium">Corporate Blood Camp</h5>
                                <p class="text-sm text-gray-600">📍 Tech Park Office Complex</p>
                                <p class="text-sm text-gray-600">🕒 February 20, 2026 | 10:00 AM - 4:00 PM</p>
                            </div>
                        </div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 class="font-semibold text-green-600 mb-3">🎯 Event Benefits</h4>
                        <ul class="space-y-2 text-sm">
                            <li>• Free health screening</li>
                            <li>• Refreshments provided</li>
                            <li>• Donation certificates</li>
                            <li>• Community recognition</li>
                            <li>• Meet fellow donors</li>
                            <li>• Expert medical staff</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <section id="donor-stories" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-heart text-red-600 text-xl"></i>
                Donor Success Stories
            </h3>
            <div class="space-y-6 text-gray-700">
                <p>Inspiring stories from our donor community:</p>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-lg border border-red-100">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                                R
                            </div>
                            <div>
                                <h4 class="font-semibold">Rajesh Kumar</h4>
                                <p class="text-sm text-gray-600">50+ Donations</p>
                            </div>
                        </div>
                        <p class="text-sm italic">"I started donating blood 15 years ago. Knowing that my donations have helped save lives gives me immense satisfaction. It's a small act that makes a big difference."</p>
                        <div class="mt-3 flex items-center gap-2 text-xs text-red-600">
                            <i class="fas fa-trophy"></i>
                            <span>Platinum Donor</span>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                                P
                            </div>
                            <div>
                                <h4 class="font-semibold">Priya Sharma</h4>
                                <p class="text-sm text-gray-600">25+ Donations</p>
                            </div>
                        </div>
                        <p class="text-sm italic">"After my father needed blood during surgery, I realized the importance of donation. Now I donate regularly and encourage others too. Every drop counts!"</p>
                        <div class="mt-3 flex items-center gap-2 text-xs text-blue-600">
                            <i class="fas fa-medal"></i>
                            <span>Gold Donor</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <section id="faq" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-question-circle text-red-600 text-xl"></i>
                Frequently Asked Questions
            </h3>
            <div class="space-y-4">
                <div class="border border-gray-200 rounded-lg">
                    <button class="w-full text-left p-4 font-semibold hover:bg-gray-50 flex items-center justify-between">
                        <span>How often can I donate blood?</span>
                        <i class="fas fa-chevron-down text-gray-400"></i>
                    </button>
                    <div class="p-4 border-t border-gray-200 bg-gray-50">
                        <p class="text-gray-700">You can donate whole blood every 56 days (8 weeks). For platelets, you can donate every 7 days, up to 24 times per year.</p>
                    </div>
                </div>
                <div class="border border-gray-200 rounded-lg">
                    <button class="w-full text-left p-4 font-semibold hover:bg-gray-50 flex items-center justify-between">
                        <span>Is blood donation safe?</span>
                        <i class="fas fa-chevron-down text-gray-400"></i>
                    </button>
                    <div class="p-4 border-t border-gray-200 bg-gray-50">
                        <p class="text-gray-700">Yes, blood donation is completely safe. All equipment is sterile and single-use. There's no risk of infection from donating blood.</p>
                    </div>
                </div>
                <div class="border border-gray-200 rounded-lg">
                    <button class="w-full text-left p-4 font-semibold hover:bg-gray-50 flex items-center justify-between">
                        <span>How long does the donation process take?</span>
                        <i class="fas fa-chevron-down text-gray-400"></i>
                    </button>
                    <div class="p-4 border-t border-gray-200 bg-gray-50">
                        <p class="text-gray-700">The entire process takes about 45-60 minutes, including registration, screening, and recovery. The actual blood collection takes only 8-10 minutes.</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="contact-support" class="rs-section hidden modern-card p-6 mt-6">
            <h3 class="text-xl font-semibold mb-4 flex items-center gap-3">
                <i class="fas fa-headset text-red-600 text-xl"></i>
                Contact Support
            </h3>
            <div class="space-y-4 text-gray-700">
                <p>Need help? Our support team is here to assist you:</p>
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-blue-600 mb-2">📞 Phone Support</h4>
                            <p class="text-sm">Toll-free: 1800-123-BLOOD</p>
                            <p class="text-sm">Available 24/7</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-green-600 mb-2">✉️ Email Support</h4>
                            <p class="text-sm">support@blooddonation.org</p>
                            <p class="text-sm">Response within 24 hours</p>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-purple-600 mb-2">💬 Live Chat</h4>
                            <p class="text-sm">Available on website</p>
                            <p class="text-sm">Mon-Fri: 9 AM - 6 PM</p>
                        </div>
                        <div class="bg-yellow-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-yellow-600 mb-2">🏢 Visit Us</h4>
                            <p class="text-sm">Regional Blood Center</p>
                            <p class="text-sm">123 Health Street, City</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>


        <!-- Back to Top Button -->
        <button id="backToTop" class="fixed bottom-6 right-6 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-300 hover:shadow-xl opacity-0 invisible z-50" aria-label="Back to top">
            <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
        </button>

        <script>
            // Back to Top Button
            (function() {
                const backToTopButton = document.getElementById('backToTop');
                
                function toggleBackToTopButton() {
                    if (window.pageYOffset > 300) {
                        backToTopButton.classList.remove('opacity-0', 'invisible');
                        backToTopButton.classList.add('opacity-100', 'visible');
                    } else {
                        backToTopButton.classList.add('opacity-0', 'invisible');
                        backToTopButton.classList.remove('opacity-100', 'visible');
                    }
                }
                
                function scrollToTop() {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
                
                window.addEventListener('scroll', toggleBackToTopButton);
                backToTopButton.addEventListener('click', scrollToTop);
                
                toggleBackToTopButton();
            })();

            // Show informational content in a popup modal
            (function(){
              const modal = document.getElementById('rs-info-modal');
              const closeBtn = document.getElementById('rs-info-close');
              const content = document.getElementById('rs-info-content');
              function openWithSectionId(id){
                const target = document.getElementById((id||'').replace('#',''));
                if (!target) return;
                content.innerHTML = target.innerHTML;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
              }
              function closeModal(){
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                content.innerHTML = '';
              }
              document.querySelectorAll('nav a[href^="#"]').forEach(link => {
                link.addEventListener('click', function(e){ e.preventDefault(); openWithSectionId(this.getAttribute('href')); });
              });
              closeBtn.addEventListener('click', closeModal);
              modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
              document.addEventListener('keydown', function(e){ if (!modal.classList.contains('hidden') && e.key === 'Escape') closeModal(); });
              if (location.hash){ openWithSectionId(location.hash); }
            })();

            function editDonation(id, date, units, notes) {
                document.getElementById('edit-donation-id').value = id;
                document.getElementById('edit-donation-date').value = date;
                document.getElementById('edit-donation-units').value = units;
                document.getElementById('edit-donation-notes').value = notes;
                document.getElementById('edit-donation-modal').classList.remove('hidden');
            }

            function editReminder(id, date, text) {
                document.getElementById('edit-reminder-id').value = id;
                document.getElementById('edit-reminder-date').value = date;
                document.getElementById('edit-reminder-text').value = text;
                document.getElementById('edit-reminder-modal').classList.remove('hidden');
            }

            function deleteItem(type, id) {
                if (confirm('Are you sure you want to delete this ' + type + '?')) {
                    const form = document.createElement('form');
                    form.method = 'post';
                    form.innerHTML = '<input name="action" value="delete_' + type + '"><input name="' + type + '_id" value="' + id + '">';
                    document.body.appendChild(form);
                    form.submit();
                }
            }

            function closeModal(modalId) {
                document.getElementById(modalId).classList.add('hidden');
            }

            // Profile Picture Modal Functions (moved below with drag and drop initialization)

            function closeProfilePictureModal() {
                document.getElementById('profile-picture-modal').classList.add('hidden');
                document.body.style.overflow = 'auto';
                // Reset form
                document.getElementById('profile_picture').value = '';
                document.getElementById('image-preview').classList.add('hidden');
            }

            function previewImage(input) {
                if (input.files && input.files[0]) {
                    const file = input.files[0];
                    
                    // Validate file type
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                    if (!allowedTypes.includes(file.type)) {
                        alert('Please select a JPG, JPEG, or PNG image.');
                        input.value = '';
                        return;
                    }
                    
                    // Validate file size (5MB max)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('File size must be less than 5MB.');
                        input.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        document.getElementById('preview-img').src = e.target.result;
                        document.getElementById('image-preview').classList.remove('hidden');
                    };
                    reader.readAsDataURL(file);
                }
            }

            function removeProfilePicture() {
                if (confirm('Are you sure you want to remove your profile picture?')) {
                    const form = document.createElement('form');
                    form.method = 'post';
                    form.innerHTML = '<input name="action" value="remove_profile_picture">';
                    document.body.appendChild(form);
                    form.submit();
                }
            }

            // Drag and Drop functionality
            function initializeDragAndDrop() {
                const dropZone = document.getElementById('drop-zone');
                const fileInput = document.getElementById('profile_picture');
                
                if (!dropZone || !fileInput) return;

                // Prevent default drag behaviors
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, preventDefaults, false);
                    document.body.addEventListener(eventName, preventDefaults, false);
                });

                // Highlight drop zone when item is dragged over it
                ['dragenter', 'dragover'].forEach(eventName => {
                    dropZone.addEventListener(eventName, highlight, false);
                });

                ['dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, unhighlight, false);
                });

                // Handle dropped files
                dropZone.addEventListener('drop', handleDrop, false);

                function preventDefaults(e) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                function highlight(e) {
                    dropZone.classList.add('border-blue-500', 'bg-blue-50');
                    dropZone.classList.remove('border-gray-300');
                }

                function unhighlight(e) {
                    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
                    dropZone.classList.add('border-gray-300');
                }

                function handleDrop(e) {
                    const dt = e.dataTransfer;
                    const files = dt.files;

                    if (files.length > 0) {
                        const file = files[0];
                        
                        // Validate file type
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
                        if (!allowedTypes.includes(file.type)) {
                            alert('Please select a JPG, JPEG, or PNG image.');
                            return;
                        }
                        
                        // Validate file size (5MB max)
                        if (file.size > 5 * 1024 * 1024) {
                            alert('File size must be less than 5MB.');
                            return;
                        }

                        // Set the file to the input and trigger preview
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        // Trigger preview
                        previewImage(fileInput);
                    }
                }
            }

            // Initialize drag and drop when modal opens
            function openProfilePictureModal() {
                document.getElementById('profile-picture-modal').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
                
                // Initialize drag and drop after modal is shown
                setTimeout(() => {
                    initializeDragAndDrop();
                }, 100);
            }

        // Dynamic phone validation based on country selection
            function updatePhoneValidation(countrySelectId, phoneInputId, codeInputId = null) {
                const countrySelect = document.getElementById(countrySelectId);
                const phoneInput = document.getElementById(phoneInputId);
                const codeInput = codeInputId ? document.getElementById(codeInputId) : null;
                if (!countrySelect || !phoneInput) return;

                const countryPhoneRules = {
                    'India': { code: '+91', phonePattern: '[6-9][0-9]{9}', placeholder: '9876543210', title: 'Enter 10 digits starting with 6-9' },
                    'Nepal': { code: '+977', phonePattern: '[1-9][0-9]{7,8}', placeholder: '12345678', title: 'Enter 8-9 digits starting with 1-9' },
                    'Sri Lanka': { code: '+94', phonePattern: '[0-9]{9}', placeholder: '712345678', title: 'Enter 9 digits' },
                    'Bangladesh': { code: '+880', phonePattern: '1[3-9][0-9]{8}', placeholder: '1712345678', title: 'Enter 10 digits starting with 1 and then 3-9' },
                    'Indonesia': { code: '+62', phonePattern: '[0-9]{9,12}', placeholder: '81234567890', title: 'Enter 9-12 digits' },
                    'Malaysia': { code: '+60', phonePattern: '[0-9]{9,10}', placeholder: '123456789', title: 'Enter 9-10 digits' },
                    'Vietnam': { code: '+84', phonePattern: '[0-9]{9,10}', placeholder: '912345678', title: 'Enter 9-10 digits' },
                    'Japan': { code: '+81', phonePattern: '[0-9]{9,10}', placeholder: '9012345678', title: 'Enter 9-10 digits' },
                    'United States': { code: '+1', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                    'United Kingdom': { code: '+44', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                    'Canada': { code: '+1', phonePattern: '[0-9]{10}', placeholder: '1234567890', title: 'Enter 10 digits' },
                    'Australia': { code: '+61', phonePattern: '[0-9]{9}', placeholder: '412345678', title: 'Enter 9 digits' },
                    'Other': { code: '+1', phonePattern: '[0-9]{7,15}', placeholder: '1234567890', title: 'Enter digits only' }
                };

                function applyRule() {
                    const selectedCountry = countrySelect.value;
                    const rule = countryPhoneRules[selectedCountry] || countryPhoneRules['Other'];
                    phoneInput.pattern = rule.phonePattern;
                    phoneInput.placeholder = rule.placeholder;
                    phoneInput.title = rule.title;
                    if (codeInput) {
                        codeInput.value = rule.code;
                    }
                }

                countrySelect.addEventListener('change', applyRule);
                applyRule();
            }

            function combinePhone(formId, codeId, phoneId) {
                const code = document.getElementById(codeId).value;
                const phone = document.getElementById(phoneId).value.replace(/\D/g, '');
                document.getElementById(phoneId).value = code + phone;
            }

            // Initialize phone validation for forms (if elements exist)
            if (document.getElementById('country') && document.getElementById('phone')) {
                updatePhoneValidation('country', 'phone');
            }
            if (document.getElementById('country-mandatory') && document.getElementById('mandatory-phone')) {
                updatePhoneValidation('country-mandatory', 'mandatory-phone', 'mandatory-country-code');
            }

            // Unified country code update handler
            function updateCountryCode(countrySelectId, codeInputId) {
                const countrySelect = document.getElementById(countrySelectId);
                const codeInput = document.getElementById(codeInputId);
                
                if (!countrySelect || !codeInput) return;
                
                const countryPhoneRules = {
                    'India': '+91',
                    'Nepal': '+977',
                    'Sri Lanka': '+94',
                    'Bangladesh': '+880',
                    'Indonesia': '+62',
                    'Malaysia': '+60',
                    'Vietnam': '+84',
                    'Japan': '+81',
                    'United States': '+1',
                    'United Kingdom': '+44',
                    'Canada': '+1',
                    'Australia': '+61'
                };
                
                countrySelect.addEventListener('change', function() {
                    const country = this.value;
                    codeInput.value = countryPhoneRules[country] || '+1';
                });
            }

            // Initialize country code handlers
            updateCountryCode('edit-profile-country', 'edit-profile-country-code');
            updateCountryCode('country-mandatory', 'mandatory-country-code');

            // Country auto-detection removed for better performance and privacy
        </script>

        <script>
            // Modal open/close handlers
            
            // Friend-related modal handlers removed

            // Show mandatory details modal if needed
            <?php if ($showMandatoryPopup): ?>
            (function() {
                const modal = document.getElementById('mandatory-modal');
                const modalContent = document.getElementById('mandatory-modal-content');
                modal.classList.remove('hidden');
                setTimeout(() => {
                    modalContent.classList.remove('scale-95', 'opacity-0');
                    modalContent.classList.add('scale-100', 'opacity-100');
                }, 100);
            })();
            <?php endif; ?>
                })
                .catch(error => {
                    console.error('Error fetching donors:', error);
                });
            });

        </script>

<script>
const eligibilityMessage = document.getElementById('eligibility-message');
const countdownDisplay = document.getElementById('countdown-display');
if (eligibilityMessage && eligibilityMessage.hasAttribute('data-timestamp')) {
    const targetTime = parseInt(eligibilityMessage.getAttribute('data-timestamp'));
    function updateCountdown() {
        const now = Date.now();
        const remaining = targetTime - now;
        if (remaining <= 0) {
            eligibilityMessage.innerHTML = 'You are eligible to donate now!';
            if (countdownDisplay) countdownDisplay.style.display = 'none';
            return;
        }
        if (countdownDisplay) countdownDisplay.style.display = 'grid';
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        document.getElementById('days').innerHTML = days;
        document.getElementById('hours').innerHTML = hours;
        document.getElementById('minutes').innerHTML = minutes;
        document.getElementById('seconds').innerHTML = seconds;
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
}
</script>


<!-- Edit Profile Full-Screen Modal -->
<div id="profile-modal" class="hidden fixed inset-0 bg-gradient-to-br from-green-50 via-white to-blue-50 z-[99998] overflow-hidden" style="position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 99998 !important;">
    <!-- Header Bar -->
    <div class="bg-gradient-to-r from-green-500 via-green-600 to-teal-600 text-white p-6 shadow-2xl relative overflow-hidden">
        <div class="flex items-center justify-between max-w-7xl mx-auto relative z-10">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30 shadow-lg">
                    <i class="fas fa-user-edit text-white text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-3xl font-bold mb-1">Edit Your Profile</h2>
                    <p class="text-green-100 text-base">Update your information and preferences</p>
                </div>
            </div>
            <button id="profile-modal-close" class="w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-2xl flex items-center justify-center transition-all duration-300">
                <i class="fas fa-times text-white text-xl"></i>
            </button>
        </div>
    </div>
    
    <!-- Content -->
    <div class="h-full overflow-y-auto" style="height: calc(100vh - 104px);">
        <div class="max-w-6xl mx-auto p-8">
            <form method="post" class="space-y-8">
                <input type="hidden" name="action" value="edit_profile">
                
                <!-- Personal Information -->
                <div class="bg-white rounded-2xl p-8 shadow-lg">
                    <h3 class="text-xl font-bold text-gray-800 mb-6">Personal Information</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                            <input class="w-full p-4 border border-gray-300 rounded-xl" type="text" name="name" value="<?php echo htmlspecialchars($me['full_name']); ?>" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                            <input class="w-full p-4 border border-gray-300 rounded-xl" type="email" name="email" value="<?php echo htmlspecialchars($me['email'] ?? ''); ?>" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Blood Type *</label>
                            <select class="w-full p-4 border border-gray-300 rounded-xl" name="blood_type" required>
                                <option value="">Select Blood Type</option>
                                <?php
                                $bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
                                foreach ($bloodTypes as $type) {
                                    $selected = ($me['blood_type'] ?? '') === $type ? 'selected' : '';
                                    echo "<option value=\"$type\" $selected>$type</option>";
                                }
                                ?>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Date of Birth *</label>
                            <input class="w-full p-4 border border-gray-300 rounded-xl" type="date" name="dob" value="<?php echo htmlspecialchars($me['dob'] ?? ''); ?>" required>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Information -->
                <div class="bg-white rounded-2xl p-8 shadow-lg">
                    <h3 class="text-xl font-bold text-gray-800 mb-6">Contact Information</h3>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Country *</label>
                            <select class="w-full p-4 border border-gray-300 rounded-xl" name="country" required>
                                <option value="">Select country</option>
                                <?php
                                foreach ($countries as $countryOption) {
                                    $selected = ($me['country'] ?? '') === $countryOption ? 'selected' : '';
                                    echo "<option value=\"" . htmlspecialchars($countryOption) . "\" $selected>" . htmlspecialchars($countryOption) . "</option>";
                                }
                                ?>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                            <input class="w-full p-4 border border-gray-300 rounded-xl" type="tel" name="phone" value="<?php echo htmlspecialchars($me['phone'] ?? ''); ?>" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                            <input class="w-full p-4 border border-gray-300 rounded-xl" type="text" name="state" value="<?php echo htmlspecialchars($me['state'] ?? ''); ?>" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                            <input class="w-full p-4 border border-gray-300 rounded-xl" type="text" name="city" value="<?php echo htmlspecialchars($me['city'] ?? ''); ?>" required>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex gap-6 pt-6">
                    <button type="button" id="edit-profile-cancel" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-xl font-semibold transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold transition-colors">
                        Update Profile
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Complete Profile Full-Screen Modal -->
<div id="complete-profile-modal" class="hidden fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-red-50 z-[99999] overflow-hidden" style="position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 99999 !important;">
    <!-- Header Bar -->
    <div class="bg-gradient-to-r from-red-500 via-red-600 to-pink-600 text-white p-6 shadow-2xl relative overflow-hidden">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
            <div class="absolute top-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
            <div class="absolute bottom-0 left-1/2 w-20 h-20 bg-white rounded-full -translate-x-10 translate-y-10"></div>
        </div>
        
        <div class="flex items-center justify-between max-w-7xl mx-auto relative z-10">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30 shadow-lg">
                    <i class="fas fa-user-plus text-white text-2xl"></i>
                </div>
                <div>
                    <h2 class="text-3xl font-bold mb-1 flex items-center gap-3">
                        Complete Your Profile
                        <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </h2>
                    <p class="text-red-100 text-base flex items-center gap-2">
                        <i class="fas fa-map-marker-alt text-yellow-400"></i>
                        Add your location details to help us serve you better
                    </p>
                </div>
            </div>
            <button id="complete-profile-modal-close" aria-label="Close modal" class="w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-2xl flex items-center justify-center transition-all duration-300 group border border-white border-opacity-30 backdrop-blur-sm">
                <i class="fas fa-times text-white text-xl group-hover:scale-110 group-hover:rotate-90 transition-all duration-300"></i>
            </button>
        </div>
    </div>
    
    <!-- Full-Screen Content -->
    <div class="h-full overflow-y-auto" style="height: calc(100vh - 104px); background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); position: relative;">
        <div class="max-w-5xl mx-auto p-8 lg:p-12" style="position: relative; z-index: 1;">
            <!-- Progress Indicator -->
            <div class="mb-12">
                <div class="flex items-center justify-center">
                    <div class="flex items-center space-x-8">
                        <div class="flex items-center group">
                            <div class="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <i class="fas fa-map-marker-alt"></i>
                            </div>
                            <span class="ml-3 text-lg font-semibold text-red-600">Location Details</span>
                        </div>
                        <div class="w-24 h-1 bg-gradient-to-r from-red-500 to-gray-300 rounded-full"></div>
                        <div class="flex items-center group">
                            <div class="w-12 h-12 bg-gray-300 rounded-2xl flex items-center justify-center text-gray-600 text-lg font-bold shadow-lg group-hover:scale-105 transition-transform duration-300">
                                <i class="fas fa-check"></i>
                            </div>
                            <span class="ml-3 text-lg font-semibold text-gray-500">Complete</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Main Form Card -->
            <div class="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
                <!-- Card Header -->
                <div class="bg-gradient-to-r from-blue-50 to-red-50 p-8 border-b border-gray-100 relative overflow-hidden">
                    <!-- Background Pattern -->
                    <div class="absolute inset-0 opacity-5">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full translate-x-16 -translate-y-16"></div>
                        <div class="absolute bottom-0 left-0 w-24 h-24 bg-blue-500 rounded-full -translate-x-12 translate-y-12"></div>
                    </div>
                    
                    <div class="text-center relative z-10">
                        <div class="w-20 h-20 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                            <i class="fas fa-globe-asia text-white text-2xl"></i>
                        </div>
                        <h3 class="text-3xl font-bold text-gray-800 mb-3 flex items-center justify-center gap-3">
                            <i class="fas fa-map-marker-alt text-red-500"></i>
                            Add Your Location
                        </h3>
                        <p class="text-gray-600 text-lg flex items-center justify-center gap-2">
                            <i class="fas fa-heart text-red-400 animate-pulse"></i>
                            Help us connect you with nearby blood seekers
                        </p>
                    </div>
                </div>
                
                <!-- Form Content -->
                <div class="p-10" style="position: relative; z-index: 1;">
                    <form method="post" class="space-y-8" id="complete-profile-form" style="position: relative; z-index: 1;">
                        <input type="hidden" name="action" value="complete_profile">
                        
                        <!-- Country Section -->
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 relative overflow-hidden">
                            <!-- Background decoration -->
                            <div class="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full opacity-20 translate-x-10 -translate-y-10"></div>
                            
                            <div class="relative z-10">
                                <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <i class="fas fa-globe text-white"></i>
                                    </div>
                                    Country Information
                                    <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                </h3>
                                <div class="grid md:grid-cols-1 gap-6">
                                    <div>
                                        <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <i class="fas fa-flag text-blue-500"></i>
                                            Country
                                        </label>
                                        <div class="relative">
                                            <input class="w-full modern-input bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed pl-16 pr-12 py-4 text-lg font-medium border-2 border-gray-200" type="text" value="India" readonly>
                                            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <span class="text-3xl">🇮🇳</span>
                                            </div>
                                            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                <div class="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center">
                                                    <i class="fas fa-lock text-gray-500"></i>
                                                </div>
                                            </div>
                                        </div>
                                        <p class="text-sm text-blue-600 mt-2 flex items-center gap-2">
                                            <i class="fas fa-info-circle"></i>
                                            Currently serving India only - More countries coming soon!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Location Section -->
                        <div class="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-8 border border-red-100 relative overflow-hidden">
                            <!-- Background decoration -->
                            <div class="absolute top-0 left-0 w-24 h-24 bg-red-200 rounded-full opacity-20 -translate-x-12 -translate-y-12"></div>
                            <div class="absolute bottom-0 right-0 w-16 h-16 bg-pink-200 rounded-full opacity-20 translate-x-8 translate-y-8"></div>
                            
                            <div class="relative z-10">
                                <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div class="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <i class="fas fa-map-marker-alt text-white"></i>
                                    </div>
                                    Location Details
                                    <div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                </h3>
                                <div class="grid md:grid-cols-3 gap-6">
                                    <div>
                                        <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <i class="fas fa-map text-red-500"></i>
                                            State *
                                        </label>
                                        <div class="relative">
                                            <select class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white appearance-none" name="state" id="profile-state" required style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                                <option value="">Select your state</option>
                                                <option value="Andhra Pradesh">Andhra Pradesh</option>
                                                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                                <option value="Assam">Assam</option>
                                                <option value="Bihar">Bihar</option>
                                                <option value="Chhattisgarh">Chhattisgarh</option>
                                                <option value="Goa">Goa</option>
                                                <option value="Gujarat">Gujarat</option>
                                                <option value="Haryana">Haryana</option>
                                                <option value="Himachal Pradesh">Himachal Pradesh</option>
                                                <option value="Jharkhand">Jharkhand</option>
                                                <option value="Karnataka">Karnataka</option>
                                                <option value="Kerala">Kerala</option>
                                                <option value="Madhya Pradesh">Madhya Pradesh</option>
                                                <option value="Maharashtra">Maharashtra</option>
                                                <option value="Manipur">Manipur</option>
                                                <option value="Meghalaya">Meghalaya</option>
                                                <option value="Mizoram">Mizoram</option>
                                                <option value="Nagaland">Nagaland</option>
                                                <option value="Odisha">Odisha</option>
                                                <option value="Punjab">Punjab</option>
                                                <option value="Rajasthan">Rajasthan</option>
                                                <option value="Sikkim">Sikkim</option>
                                                <option value="Tamil Nadu">Tamil Nadu</option>
                                                <option value="Telangana">Telangana</option>
                                                <option value="Tripura">Tripura</option>
                                                <option value="Uttar Pradesh">Uttar Pradesh</option>
                                                <option value="Uttarakhand">Uttarakhand</option>
                                                <option value="West Bengal">West Bengal</option>
                                                <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                                                <option value="Chandigarh">Chandigarh</option>
                                                <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                                                <option value="Delhi">Delhi</option>
                                                <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                                                <option value="Ladakh">Ladakh</option>
                                                <option value="Lakshadweep">Lakshadweep</option>
                                                <option value="Puducherry">Puducherry</option>
                                            </select>
                                            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <i class="fas fa-map text-red-500"></i>
                                            </div>
                                            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                <i class="fas fa-chevron-down text-gray-400"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <i class="fas fa-building text-red-500"></i>
                                            District *
                                        </label>
                                        <div class="relative">
                                            <select class="w-full modern-input border-2 border-gray-200 rounded-xl bg-gray-50 appearance-none" name="district" id="profile-district" required disabled style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                                <option value="">First select a state</option>
                                            </select>
                                            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <i class="fas fa-building text-gray-400"></i>
                                            </div>
                                            <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                <i class="fas fa-chevron-down text-gray-400"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            <i class="fas fa-city text-red-500"></i>
                                            City/Town *
                                        </label>
                                        <div class="relative">
                                            <input class="w-full modern-input border-2 border-gray-200 rounded-xl bg-white" type="text" name="city" id="profile-city" placeholder="Enter your city or town" required style="padding: 16px 40px 16px 48px; font-size: 16px; line-height: 1.5; height: 60px;">
                                            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <i class="fas fa-city text-red-500"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-6 pt-10 mt-10 border-t-2 border-gray-100">
                            <button type="button" id="complete-profile-cancel" class="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-colors duration-200 flex items-center justify-center gap-3 shadow-lg">
                                <i class="fas fa-times text-xl"></i>
                                Cancel
                            </button>
                            <button type="submit" class="flex-1 bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-colors duration-200 shadow-xl flex items-center justify-center gap-3 relative overflow-hidden">
                                <div class="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
                                <i class="fas fa-heart text-xl animate-pulse"></i>
                                Complete Profile
                                <i class="fas fa-arrow-right text-lg"></i>
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Security & Trust Message -->
                <div class="mt-12 text-center">
                    <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-100">
                        <div class="flex items-center justify-center gap-4 mb-4">
                            <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <i class="fas fa-shield-alt text-white text-xl"></i>
                            </div>
                            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <i class="fas fa-heart text-white text-xl"></i>
                            </div>
                            <div class="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <i class="fas fa-users text-white text-xl"></i>
                            </div>
                        </div>
                        <h4 class="text-lg font-bold text-gray-800 mb-2">🔒 Your Privacy is Protected</h4>
                        <p class="text-gray-600 text-base">
                            Your information is secure and will only be used to connect you with nearby blood seekers in emergency situations.
                        </p>
                        <div class="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
                            <span class="flex items-center gap-1">
                                <i class="fas fa-lock text-green-500"></i>
                                Encrypted Data
                            </span>
                            <span class="flex items-center gap-1">
                                <i class="fas fa-user-shield text-blue-500"></i>
                                Privacy First
                            </span>
                            <span class="flex items-center gap-1">
                                <i class="fas fa-handshake text-purple-500"></i>
                                Trusted Platform
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script src="complete_profile.js"></script>
</body>
</html>
