// Script to manually upgrade a user to admin
// Run this in browser console (F12)

function makeUserAdmin(email) {
    // Get all users
    const usersJson = localStorage.getItem('users');
    if (!usersJson) {
        console.error('No users found');
        return;
    }

    const users = JSON.parse(usersJson);

    // Find user by email
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) {
        console.error(`User with email "${email}" not found`);
        console.log('Available users:', users.map(u => u.email));
        return;
    }

    // Upgrade to admin
    users[userIndex].isAdmin = true;
    users[userIndex].lastLogin = Date.now();

    // Save back
    localStorage.setItem('users', JSON.stringify(users));

    console.log(`✅ User "${users[userIndex].name}" (${email}) is now an admin!`);
    console.log('Please refresh the page.');
}

// Usage:
console.log('To make a user admin, run:');
console.log('makeUserAdmin("youremail@example.com")');

// Auto-run for youremail@example.com
makeUserAdmin('youremail@example.com');
