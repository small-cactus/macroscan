# Project Scripts Overview 📄

This document provides an overview of the key scripts included in the project. Below is a summary table for each script, detailing its purpose, a link for more detailed information, and the basic command to run it.

| Script File                     | Description                      | More Info | Command to Run             |
|---------------------------------|----------------------------------|-----------|----------------------------|
| `validate_user_and_test_api.js` | User validation and API testing  | [Details](#validate_user_and_test_apijs) | `node validate_user_and_test_api.js` |
| `upload_api_keys.js`            | Uploads API keys                 | [Details](#upload_api_keysjs) | `node upload_api_keys.js`            |
| `firestore_management_tool.py`  | Manages Firestore data           | [Details](#firestore_management_toolpy) | `python firestore_management_tool.py` |
| `create_and_save_users.py`      | Adds new users to the database   | [Details](#create_and_save_userspy) | `python create_and_save_users.py`    |

## Scripts and Their Functions 🛠️

### `validate_user_and_test_api.js`

This script offers a command line menu for user validation and API testing.

**Command Line Menu**:

```md
Choose an option:
1. Random user
2. Specific user
3. Group of all users
4. Number of random users
5. Specific users
Enter choice:
```

**Options Explained**:
1. **Random user**: Validates a randomly selected user from the database with an existing or new API key and tests the key.
2. **Specific user**: Allows selection of a specific user by ID (4 digits) for validation and testing; no action is taken if the user ID does not exist.
3. **Group of all users**: Validates and tests all users in the database. Use this option only if the database contains fewer than 10 users.
4. **Number of random users**: Validates and tests a specified number of random users.
5. **Specific users**: Validates and tests a group of users specified by comma-separated IDs; skips process if any user ID does not exist.

### `upload_api_keys.js`

This script is responsible for uploading API keys.

> :warning: **Important**: This will upload the API keys from the `upload_api_keys.js` file. It checks if the key already exists to avoid duplicates. Ensure that only valid, working API keys are uploaded.

### `firestore_management_tool.py`

This script provides a command line interface for managing Firestore data.

**Command Line Menu**:

```md
Firestore Data Management Tool
1. View all users
2. View number of users
3. View all API keys
4. View users assigned to a specific API key
5. View number of users on a specific API key
6. Delete all data
7. Exit
Enter your choice:
```

**Options Explained**:
1. Displays a formatted list of all users.
2. Shows the total number of users in the database.
3. Displays a formatted list of all API keys.
4. Shows user IDs assigned to a specific API key.
5. Displays how many users are assigned to a specific API key (maximum 5).
6. Deletes all user and API key data; use with caution.
7. Exits the script.

### `create_and_save_users.py`

This script interacts with the database to add new users.

```md
Currently, there are 6 users in the database.
Enter the number of users to add:
```

> :bulb: **Tip**: Displays the current number of users and allows the addition of new users with randomly generated names, emails, and user IDs. There is no exit command; use Ctrl + C to terminate.
