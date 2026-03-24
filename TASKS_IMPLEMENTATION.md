# Tasks Implementation for MEAN Mini Project

## 1. Node.js Setup
- Install Node.js from the official [Node.js website](https://nodejs.org/).
- Initialize a new Node.js project with:
  ```bash
  npm init -y
  ```

## 2. Express Server
- Install Express with:
  ```bash
  npm install express
  ```
- Create an `app.js` file and add the following code to set up a basic Express server:
  ```javascript
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
  });
  ```

## 3. Bootstrap Integration
- Include Bootstrap in your project by adding the CDN link in your HTML files:
  ```html
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  ```

## 4. MongoDB CRUD Operations
- Install MongoDB and run a local instance or use MongoDB Atlas.
- Use the following code snippets for CRUD:
  - **Create**:
    ```javascript
    const mongoose = require('mongoose');

    const Item = mongoose.model('Item', { name: String });

    const newItem = new Item({ name: 'New Task' });
    newItem.save();
    ```
  - **Read**:
    ```javascript
    Item.find({}, (err, items) => {
        console.log(items);
    });
    ```
  - **Update**:
    ```javascript
    Item.updateOne({ name: 'New Task' }, { name: 'Updated Task' }, (err) => {
        console.log('Task updated');
    });
    ```
  - **Delete**:
    ```javascript
    Item.deleteOne({ name: 'Updated Task' }, (err) => {
        console.log('Task deleted');
    });
    ```

## 5. Mongoose Data Models
- Define Mongoose schemas/models:
  ```javascript
  const userSchema = new mongoose.Schema({
      username: String,
      password: String,
  });

  const User = mongoose.model('User', userSchema);
  ```

## 6. Database Connection
- Connect to MongoDB using Mongoose:
  ```javascript
  mongoose.connect('mongodb://localhost:27017/mydatabase', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
  });
  ```

## 7. Angular Components
- Create Angular components using Angular CLI:
  ```bash
  ng generate component componentName
  ```

## 8. SPA Architecture
- Use Angular routing to create a Single Page Application:
  ```javascript
  const routes: Routes = [
      { path: 'home', component: HomeComponent },
      { path: 'about', component: AboutComponent },
      { path: '', redirectTo: '/home', pathMatch: 'full' }
  ];
  ```

## 9. Authentication System
- Implement user authentication with libraries such as Passport.js:
  ```javascript
  const passport = require('passport');
  // Set up strategies, serialize, and deserialize functions
  ```

### Conclusion
This document outlines the comprehensive steps for implementing the MEAN stack project tasks.
