module.exports = function(app) {
    // Example route that you can link to from the frontend
    app.get('/new-route', (req, res) => {
      res.send('This is the new route served by server2.js!');
    });
    
    // More logic, APIs, or routes can be added here
  };
  