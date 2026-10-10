# 🎓 College Lost & Found Management System

A web-based application that helps college students report lost items, report found items, and recover their belongings on campus.

## 📌 About the Project

The College Lost & Found Management System provides a simple platform for students to report missing belongings and view items found around campus. It uses Firebase to support authentication and store item reports.

## ✨ Features

- 🔐 Student sign-in using Firebase Authentication
- 📦 Report lost items
- 🔎 Report found items
- 📋 View lost and found item listings
- 🤝 Possible-match detection
- ✅ Mark lost items as returned
- 🔥 Store reports in Firebase Firestore
- 🔒 Store contact information in a separate subcollection

## 🛠️ Technologies Used

- HTML
- CSS
- JavaScript
- Firebase Authentication
- Firebase Cloud Firestore
- GitHub

## 📁 Project Structure

```text
College-Lost-and-Found/
├── index.html
├── style.css
├── script.js
├── firebase-config.js
└── README.md
```

## 🚀 How to Run the Project

1. Clone or download this repository.
2. Open the project folder.
3. Open `index.html` in a browser.
4. Sign in using a Firebase Authentication account.
5. Try reporting a lost or found item.

For cloud functionality, configure the Firebase project and Firestore security rules correctly.

## 🔥 Firebase Setup

This project uses Firebase Authentication for sign-in and Cloud Firestore for storing item reports.

To run your own copy:

1. Create a Firebase project.
2. Enable the required sign-in provider.
3. Configure Cloud Firestore.
4. Add your Firebase web configuration to `firebase-config.js`.
5. Set secure Firestore rules before using the application.

**Security note:** Never upload service-account private keys or other server-side secrets to GitHub. Keep Firestore security rules enabled and protect private contact information.

## 🌐 Deployment

The website can be hosted using GitHub Pages after configuring Firebase authentication and security for the published domain.

## 🎯 Project Objective

The goal of this project is to make lost-and-found management easier, faster, and more organized within a college campus.

## 👨‍💻 Author

College Lost & Found Management System — Academic Project
