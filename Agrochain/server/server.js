
const multer = require("multer");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");


const dotenv = require('dotenv');
dotenv.config();



const app = express();
app.use(bodyParser.json());
app.use(cors());


// Serve images in the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public"))); // Public directory

let products = []; // Temporary in-memory storage for products

// Serve landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});


// Create MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "agrochain",
  password: "agrochain",
  database: "agrochain", // your database name
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Connected to database");
});

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Serve static files from the 'static' directory
app.use(express.static(path.join(__dirname, 'static')));

// Endpoint to serve the farmer.html file
app.get("/farmer", (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'farmer.html'));
});

// Endpoint to register a farmer (POST request)
app.post("/register/farmer", (req, res) => {
  const { id, name, email, password, location, blockchain } = req.body;

  // Ensure that all fields are provided and ID is an integer
  if (!id || !name || !email || !password || !location || !blockchain || isNaN(id) || id <= 0) {
    return res.status(400).send("Valid Farmer ID (positive integer) and all other fields are required");
  }

  // First, check if the ID already exists
  const checkIdQuery = "SELECT * FROM farmers WHERE id = ?";
  db.query(checkIdQuery, [id], (err, results) => {
    if (err) {
      console.error("Error checking ID:", err);
      return res.status(500).send("Internal server error");
    }

    // If the ID already exists, return an error
    if (results.length > 0) {
      return res.status(400).send("Farmer ID already exists. Please choose a different ID.");
    }

    // Check if the email already exists
    const checkEmailQuery = "SELECT * FROM farmers WHERE email = ?";
    db.query(checkEmailQuery, [email], (err, results) => {
      if (err) {
        console.error("Error checking email:", err);
        return res.status(500).send("Internal server error");
      }

      // If the email already exists, return an error
      if (results.length > 0) {
        return res.status(400).send("Email already registered. Please use a different email.");
      }

      // Hash the password before storing it
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).send("Error registering farmer");
        }

        // Insert the farmer's data into the database
        const query = "INSERT INTO farmers (id, name, email, password, location, blockchain) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(query, [id, name, email, hashedPassword, location, blockchain], (err, results) => {
          if (err) {
            console.error("Error inserting farmer:", err);
            return res.status(500).send("Error registering farmer");
          }
          res.status(200).send("Farmer registered successfully");
        });
      });
    });
  });
});

// Endpoint to register a buyer (POST request)
app.post("/register/buyer", (req, res) => {
  const { id, name, email, password, contact } = req.body;

  // Ensure that all fields are provided and ID is an integer
  if (!id || !name || !email || !password || !contact || isNaN(id) || id <= 0) {
    return res.status(400).send("Valid Buyer ID (positive integer) and all other fields are required");
  }

  // First, check if the ID already exists
  const checkIdQuery = "SELECT * FROM buyers WHERE id = ?";
  db.query(checkIdQuery, [id], (err, results) => {
    if (err) {
      console.error("Error checking ID:", err);
      return res.status(500).send("Internal server error");
    }

    // If the ID already exists, return an error
    if (results.length > 0) {
      return res.status(400).send("Buyer ID already exists. Please choose a different ID.");
    }

     // Check if the email already exists
     const checkEmailQuery = "SELECT * FROM buyers WHERE email = ?";
     db.query(checkEmailQuery, [email], (err, results) => {
       if (err) {
         console.error("Error checking email:", err);
         return res.status(500).send("Internal server error");
       }
 
       // If the email already exists, return an error
       if (results.length > 0) {
         return res.status(400).send("Email already registered. Please use a different email.");
       }
    // Hash the password before storing it
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error hashing password:", err);
        return res.status(500).send("Error registering buyer");
      }

      // Insert the buyer's data into the database
      const query = "INSERT INTO buyers (id, name, email, password, contact) VALUES (?, ?, ?, ?, ?)";
      db.query(query, [id, name, email, hashedPassword, contact], (err, results) => {
        if (err) {
          console.error("Error inserting buyer:", err);
          return res.status(500).send("Error registering buyer");
        }
        res.status(200).send("Buyer registered successfully");
      });
    });
  });
  });
});
// Endpoint for login
app.post("/login", (req, res) => {
  const { role, id, email, password } = req.body;

  if (!id || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const table = role === "farmer" ? "farmers" : "buyers";

  const query = `SELECT * FROM ${table} WHERE email = ? AND id = ?`;
  db.query(query, [email, id], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const user = results[0];
    
    // Compare the hashed password with the input password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Error comparing passwords:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }

      if (isMatch) {
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, message: "Invalid credentials" });
      }
    });
  });
});

// ------------------ PRODUCT UPLOAD ------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




// Upload Product Endpoint
app.post("/add-product", upload.single("image"), (req, res) => {
  const { name, price, description, id, available_quantity } = req.body;
  const image = req.file.filename;
  const dateOfUpload = new Date();

  if (!name || !price || !description || !id ||!available_quantity) {
    return res.status(400).send("All fields are required.");
  }

  const query = "INSERT INTO products (name, price, description, image, available_quantity, farmer_id, date_of_upload) VALUES (?, ?, ?, ?, ?, ?, ?)";
  db.query(query, [name, price, description, image, available_quantity, id, dateOfUpload], (err, results) => {
    if (err) {
      console.error("Error inserting product:", err);
      return res.status(500).send("Error uploading product.");
    }
    res.status(200).send("Product uploaded successfully.");
  });
});
// ------------------ FETCH PRODUCTS (FOR BOTH FARMER AND BUYER) ------------------
app.get("/products", (req, res) => {
  const farmerId = req.query.farmerId;  // If farmerId is provided, fetch products for that specific farmer

  let query;
  let queryParams = [];

  if (farmerId) {
    // Fetch products related to the specific farmer
    query = "SELECT * FROM products WHERE farmer_id = ?";
    queryParams.push(farmerId);
  } 
   else {
    // If neither farmerId nor buyerId is provided, return all products (fallback case)
    query = "SELECT farmer_id, pId, name, price, description, image, date_of_upload, available_quantity FROM products";
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);  // Log the error on the server for debugging
      return res.status(500).send("Error fetching products.");
    }

    if (results.length === 0) {
      console.log("No products found in the database.");
      return res.status(404).send("No products found.");
    }

    // Sending the list of products in the response
    res.json(results);
  });
});


// Serve images from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Handle POST request for placing an order
app.post("/placeOrder", (req, res) => {
  const {
    productId,
    productName,
    price,
    quantity,
    farmerId,
    buyerName,
    buyerAddress,
    buyerContact,
    buyerAlternateContact,
    buyerEmail,
    buyerId,
    buyerAccount,
  } = req.body;

  // Ensure all required fields are present
  if (
    !productId ||
    !productName ||
    !price ||
    !quantity ||
    !farmerId ||
    !buyerName ||
    !buyerAddress ||
    !buyerContact ||
    !buyerEmail ||
    !buyerId ||
    !buyerAccount
  ) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Generate a 4-digit unique ID
  const uniqueId = Math.floor(1000 + Math.random() * 9000).toString();

  // Calculate total price
  const totalPrice = price;
  const totalAmount = price * quantity;

  // Get current date and time
  const orderDate = new Date();

  // Default order status
  const orderStatus = "Wait for Farmer's Approval";

  // SQL Query to insert the order into the `ordering` table
  const insertOrderQuery = `
    INSERT INTO ordering (productId, productName, quantity, price, buyerId, farmer_id, orderDate, buyerName, buyerAddress, buyerContact, buyerAlternateContact, buyerEmail, uniqueId, orderStatus, totalAmt, buyerAccount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // SQL Query to update the `available_quantity` in the `products` table
  const updateQuantityQuery = `
    UPDATE products
    SET available_quantity = available_quantity - ?
    WHERE pId = ? AND available_quantity >= ?
  `;

  // Start a database transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).send("Error processing the order");
    }

    // Insert the order into the ordering table
    db.query(
      insertOrderQuery,
      [
        productId,
        productName,
        quantity,
        totalPrice,
        buyerId,
        farmerId,
        orderDate,
        buyerName,
        buyerAddress,
        buyerContact,
        buyerAlternateContact,
        buyerEmail,
        uniqueId,
        orderStatus,
        totalAmount,
        buyerAccount,
      ],
      (err, results) => {
        if (err) {
          console.error("Error inserting order:", err);
          db.rollback();
          return res.status(500).send("Error placing order");
        }

        // Update the available_quantity in the products table
        db.query(
          updateQuantityQuery,
          [quantity, productId, quantity],
          (err, updateResults) => {
            if (err) {
              console.error("Error updating product quantity:", err);
              db.rollback();
              return res.status(500).send("Error processing the order");
            }

            if (updateResults.affectedRows === 0) {
              db.rollback();
              return res.status(400).send("Insufficient stock to fulfill the order");
            }

            // Commit the transaction
            db.commit((err) => {
              if (err) {
                console.error("Error committing transaction:", err);
                db.rollback();
                return res.status(500).send("Error finalizing the order");
              }

              // Get the inserted order ID
              const orderId = results.insertId;

              // Send success response with order details
              return res.status(200).json({
                success: true,
                message: `Order placed successfully! Your order ID is ${orderId} and unique ID is ${uniqueId}. Wait for Farmer's approval and look into the view orders tab for further details`,
                orderId,
                uniqueId,
              });
            });
          }
        );
      }
    );
  });
});


//BuyerUI
// Fetch orders for a specific buyer
app.get('/orders/:buyerId', (req, res) => {
  const buyerId = req.params.buyerId;
  const sql = `SELECT * FROM ordering WHERE buyerId = ?`;
  db.query(sql, [buyerId], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// // Update order status to 'Cancelled'
app.post('/cancel-order', (req, res) => {
  const { orderId } = req.body;

  // Fetch the order details to get productId and quantity
  const fetchOrderQuery = `SELECT productId, quantity FROM ordering WHERE orderId = ?`;
  db.query(fetchOrderQuery, [orderId], (err, results) => {
    if (err) {
      console.error('Error fetching order details: ' + err.stack);
      return res.status(500).send('Error fetching order details');
    }

    if (results.length === 0) {
      return res.status(404).send('Order not found');
    }

    const { productId, quantity } = results[0];

    // Update the order status to 'Cancelled' and 'Order Cancelled by Buyer'
    const cancelOrderQuery = `
      UPDATE ordering
      SET orderStatus = 'Order Cancelled by Buyer', 
      buyerStatus = 'Cancelled'
      WHERE orderId = ?
    `;
    db.query(cancelOrderQuery, [orderId], (err) => {
      if (err) {
        console.error('Error updating order status: ' + err.stack);
        return res.status(500).send('Error updating order status');
      }

      // Update available quantity in products table when order is canceled
      const updateProductQuery = `
        UPDATE products
        SET available_quantity = available_quantity + ?
        WHERE pId = ?
      `;
      db.query(updateProductQuery, [quantity, productId], (err) => {
        if (err) {
          console.error('Error updating product quantity: ' + err.stack);
          return res.status(500).send('Error updating product quantity');
        }

        res.json({ message: 'Order cancelled and quantity updated successfully!' });
      });
    });
  });
});

function updateOrderAndBuyerStatus(orderId, status, buyerStatus, callback) {
  const updateQuery = `
    UPDATE ordering
    SET orderStatus = ?, buyerStatus = ?, statusUpdatedAt = NOW()
    WHERE orderId = ?
  `;
  db.query(updateQuery, [status, buyerStatus, orderId], callback);
}

app.post("/updateOrderStatus", (req, res) => {
  const { orderId, status } = req.body;

  // Determine buyerStatus
  let buyerStatus;
  switch (status) {
    case "Order Accepted":
      buyerStatus = "Approved";
      break;
    case "Order Rejected":
      buyerStatus = "Rejected by Farmer";
      break;
    case "Order Cancelled by Buyer":
      buyerStatus = "Cancelled";
      break;
    case "Delivered":
      buyerStatus = "Order Received";
      break;
    case "Delivery on the Way":
      buyerStatus = "In Transit";
      break;
    case "Wait for Farmer's Approval":
      buyerStatus = "Pending";
      break;
    default:
      buyerStatus = "Pending";
  }

  // Update statuses
  updateOrderAndBuyerStatus(orderId, status, buyerStatus, (err) => {
    if (err) {
      console.error("Error updating statuses:", err.stack);
      return res.status(500).send("Error updating order and buyer statuses");
    }
    res.json({ success: true, message: "Order status updated successfully!" });
  });
});




// app.post("/updateOrderStatus", (req, res) => {
//   const { orderId, status } = req.body;

//   // Determine buyerStatus based on orderStatus
//   let buyerStatus;
//   switch (status) {
//     case "Order Accepted":
//       buyerStatus = "Approved";
//       break;
//     case "Order Rejected":
//       buyerStatus = "Rejected by Farmer";
//       break;
//     case "Order Cancelled by Buyer":
//       buyerStatus = "Cancelled";
//       break;
//     case "Delivered":
//       buyerStatus = "Order Received";
//       break;
//     case "Delivery on the Way":
//       buyerStatus = "In Transit";
//       break;
//     case "Wait for Farmer's Approval":
//       buyerStatus = "Pending";
//       break;
//     default:
//       buyerStatus = "Pending";
//   }

//   // Update both orderStatus and buyerStatus
//   updateOrderAndBuyerStatus(orderId, status, buyerStatus, (err) => {
//     if (err) {
//       console.error("Error updating order and buyer status:", err.stack);
//       return res.status(500).send("Error updating order and buyer status");
//     }

//     res.json({ success: true, message: "Order status updated successfully!" });
//   });
// });



app.post("/verifyDelivery", (req, res) => {
  const { orderId, uniqueId } = req.body;
  db.query("SELECT uniqueId FROM ordering WHERE orderId = ?", [orderId], (err, results) => {
    if (err) throw err;

    if (results[0].uniqueId === uniqueId) {
      updateOrderAndBuyerStatus(orderId, "Delivered", "Order Received", (err) => {
        if (err) {
          console.error("Error updating delivery status:", err.stack);
          return res.status(500).send("Error verifying delivery");
        }
        res.json({ success: true });
      });
    } else {
      res.json({ success: false });
    }
  });
});




// // Verify delivery
// app.post("/verifyDelivery", (req, res) => {
//   const { orderId, uniqueId } = req.body;
//   db.query("SELECT uniqueId FROM ordering WHERE orderId = ?", [orderId], (err, results) => {
//     if (err) throw err;

//     if (results[0].uniqueId === uniqueId) {
//       db.query("UPDATE ordering SET orderStatus = 'Delivered' WHERE orderId = ?", [orderId], err => {
//         if (err) throw err;
//         res.json({ success: true });
//       });
//     } else {
//       res.json({ success: false });
//     }
//   });
// });




//Farmer orders UI
app.get('/goOrders', (req, res) => {
  const farmerId = req.query.farmerId;
  db.query('SELECT * FROM ordering WHERE farmer_id = ?', [farmerId], (err, results) => {
    if (err) {
      console.error('Error fetching orders: ' + err.stack);
      res.status(500).send('Error fetching orders');
    } else {
      res.json(results);
    }
  });
});

// Update order status
app.post('/stausOf', (req, res) => {
  const { orderId, status } = req.body;
  db.query('UPDATE ordering SET orderStatus = ? WHERE orderId = ?', [status, orderId], (err, results) => {
    if (err) {
      console.error('Error updating order status: ' + err.stack);
      res.status(500).send('Error updating order status');
    } else {
      res.json({ success: true });
    }
  });
});
//Update order status and buyer status
// Update order status and buyer status
app.post('/goodS', (req, res) => {
  const { orderId, status, buyerStatus } = req.body;

  // Fetch the order details to get productId and quantity
  const fetchOrderQuery = `SELECT productId, quantity FROM ordering WHERE orderId = ?`;
  db.query(fetchOrderQuery, [orderId], (err, results) => {
    if (err) {
      console.error('Error fetching order details: ' + err.stack);
      return res.status(500).send('Error fetching order details');
    }

    if (results.length === 0) {
      return res.status(404).send('Order not found');
    }

    const { productId, quantity } = results[0];

    // Check if the order status is "Order Rejected" or "Order Cancelled by Buyer"
    if (status === "Order Rejected" || status === "Order Cancelled by Buyer") {
      // Update the product quantity in products table when order is rejected or cancelled
      const updateProductQuery = `
        UPDATE products
        SET available_quantity = available_quantity + ?
        WHERE pId = ?
      `;
      db.query(updateProductQuery, [quantity, productId], (err) => {
        if (err) {
          console.error('Error updating product quantity: ' + err.stack);
          return res.status(500).send('Error updating product quantity');
        }
      });
    }

    // Update both the order status and buyer status
    const updateStatusQuery = `
      UPDATE ordering
      SET orderStatus = ?, buyerStatus = ?
      WHERE orderId = ?
    `;
    db.query(updateStatusQuery, [status, buyerStatus, orderId], (err) => {
      if (err) {
        console.error('Error updating order status: ' + err.stack);
        return res.status(500).send('Error updating order status');
      }

      res.json({ message: 'Order cancelled and quantity updated successfully!', orderStatus: 'Order Cancelled by Buyer' });

    });
  });
});





// SSE Route for sending order status updates
app.get('/order-updates-status-now', (req, res) => {
  const buyerId = req.query.buyerId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  setInterval(() => {
    // Query to fetch the latest order updates for the buyer
    db.query(
      `SELECT orderId, orderStatus, farmer_id, statusUpdatedAt 
       FROM ordering 
       WHERE buyerId = ? 
       ORDER BY statusUpdatedAt DESC LIMIT 1`,
      [buyerId],
      (error, results) => {
        if (error) {
          console.error('Error fetching order updates:', error);
        } else if (results.length > 0) {
          const { orderId, orderStatus, farmer_id, statusUpdatedAt } = results[0];
          const data = {
            orderId,
            orderStatus,
            farmerId: farmer_id,
            statusUpdatedAt
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      }
    );
  }, 5000); // Poll every 5 seconds
});







// const Web3 = require('web3');
// const web3 = new Web3('http://127.0.0.1:7545');  // Ganache default HTTP provider
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545')); // Initialize properly
const contractABI =[
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_farmer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_buyer",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "farmer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "PaymentMade",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "amount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "buyer",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [],
      "name": "farmer",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "setAmount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "makePayment",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function",
      "payable": true
    }
  ];
const contractAddress = '0x0CcE11941a7fFC52A2e7Eb93f513D66e6233Aae9';  // Replace with your deployed contract address

const paymentContract = new web3.eth.Contract(contractABI, contractAddress);

// Ganache accounts (Farmer and Buyer)

const farmerAccount = '0x1eF3a74b516D189F35a099e528533a38c8070B77';    // Replace with the farmer's Ganache address
const buyerAccount = '0x7591DD35059eff68B46d14c89bB6d671448B4a39'; // Replace with the buyer's Ganache address
// const buyerAccount = await paymentContract.methods.buyer().call();
// console.log("Using Buyer Address:", buyerAccount);


// Endpoint to verify unique ID and initiate payment
app.post('/uniqueid-verify', async (req, res) => {
  const { orderId, uniqueId } = req.body;

  // Verify the unique ID in the database
  db.query('SELECT * FROM ordering WHERE orderId = ? AND uniqueId = ?', [orderId, uniqueId], async (err, results) => {
    if (err) {
      console.error('Error verifying unique ID: ' + err.stack);
      res.status(500).send('Error verifying unique ID');
    } else if (results.length > 0) {
      const order = results[0];  // Assuming one result is returned
      console.log('Order Details:', order); // Add this line to inspect the order object
      let totalAmount = order.totalAmt;
      totalAmount = parseFloat(order.totalAmt);  // Convert to a number (float)
if (isNaN(totalAmount)) {
  console.error('Invalid totalAmount:', order.totalAmt);
  return res.status(400).send('Invalid totalAmount');
}

      // Update order and buyer status
      db.query('UPDATE ordering SET orderStatus = ?, buyerStatus = ? WHERE orderId = ?', ['Delivered', 'Order Received', orderId], async (err) => {
        if (err) {
          console.error('Error updating order and buyer status: ' + err.stack);
          res.status(500).send('Error updating order and buyer status');
        } else {
          try {
            // Trigger the payment after status update
            const paymentResult = await processPayment(totalAmount);
            res.json({ success: true, totalAmount });
          } catch (paymentError) {
            res.status(500).send('Error processing payment');
          }
        }
      });
    } else {
      res.json({ success: false });
    }
  });
});

async function processPayment(totalAmount) {
  // Get the buyer address from the contract
  const contractBuyer = await paymentContract.methods.buyer().call();
  console.log("Buyer Address in Contract:", contractBuyer);
  console.log("Transaction sent from Address:", contractBuyer); // Now sending from correct address

  // Use the contract buyer address dynamically
  const buyerAccount = contractBuyer;

  // Check if buyerAccount matches the contract's buyer address
  if (buyerAccount.toLowerCase() !== contractBuyer.toLowerCase()) {
    console.error("Mismatch: The transaction must be sent from the buyer's address");
    return { success: false, message: "Only the buyer can set the amount" };
  }

  try {
    const amountInWei = web3.utils.toWei(totalAmount.toString(), 'ether');  // Convert amount to Wei

    // Set the amount dynamically on the contract before making the payment
    await paymentContract.methods.setAmount(amountInWei).send({ from: buyerAccount });

    // Send the payment transaction
    const receipt = await paymentContract.methods.makePayment().send({
      from: buyerAccount,
      value: amountInWei,
      gas: 2100000,  // Adjust gas limit as needed
    });

    console.log('Payment successful from buyer to farmer:', receipt);
    return { success: true };

  } catch (error) {
    console.error('Error during payment processing:', error);
    return { success: false, message: "Transaction failed" };
  }
}

// Function to trigger payment from buyer to farmer
// async function processPayment(totalAmount) {
//   console.log("Buyer Address in Contract:", await paymentContract.methods.buyer().call());
//   console.log("Transaction sent from Address:", buyerAccount);
//   try {
//     const amountInWei = web3.utils.toWei(totalAmount.toString(), 'ether');  // Convert amount to Wei

//     // Set the amount dynamically on the contract before making the payment
//     // await paymentContract.methods.setAmount(amountInWei).send({ from: buyerAccount });
//     await paymentContract.methods.setAmount(amountInWei).send({ from: buyerAccount });


//     // Send the payment transaction
//     const receipt = await paymentContract.methods.makePayment().send({
//       from: buyerAccount,
//       value: amountInWei,
//       gas: 2100000,  // Adjust gas limit as needed
//     });

//     console.log('Payment successful from buyer to farmer:', receipt);
//     return { success: true };


//   } catch (error) {
//     console.error('Error during payment processing:', error);
//     return { success: false };
//   }
// }


const fs = require('fs');


// // Endpoint to fetch data
// app.get('/api/report', (req, res) => {
//   // Query farmers data
//   db.query('SELECT * FROM farmers', (err, farmers) => {
//     if (err) {
//       console.error('Error fetching farmers:', err);
//       return res.status(500).json({ error: 'Error fetching farmers' });
//     }

//     // For each farmer, get their products and orders
//     const farmersWithDetails = farmers.map(farmer => {
//       return new Promise((resolve, reject) => {
//         // Get farmer's products
//         db.query('SELECT * FROM products WHERE farmer_id = ?', [farmer.id], (err, products) => {
//           if (err) {
//             reject(err);
//           } else {
//             // Get farmer's orders
//             db.query('SELECT * FROM ordering WHERE farmer_id = ?', [farmer.id], (err, orders) => {
//               if (err) {
//                 reject(err);
//               } else {
//                 resolve({ farmer, products, orders });
//               }
//             });
//           }
//         });
//       });
//     });

//     // Once all farmer details are fetched
//     Promise.all(farmersWithDetails)
//       .then(farmerData => {
//         // Fetch buyers data
//         db.query('SELECT * FROM buyers', (err, buyers) => {
//           if (err) {
//             console.error('Error fetching buyers:', err);
//             return res.status(500).json({ error: 'Error fetching buyers' });
//           }
//           // Send response with farmers, products, orders, and buyers
//           res.json({ farmers: farmerData, buyers });
//         });
//       })
//       .catch(err => {
//         console.error('Error fetching farmer details:', err);
//         res.status(500).json({ error: 'Error fetching farmer details' });
//       });
//   });
// });

// // Static folder for images
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Endpoint to fetch data
// app.get('/api/report', (req, res) => {
//   // Fetch farmers
//   db.query('SELECT * FROM farmers', (err, farmers) => {
//     if (err) return res.status(500).json({ error: 'Error fetching farmers' });

//     // Fetch buyers
//     db.query('SELECT * FROM buyers', (err, buyers) => {
//       if (err) return res.status(500).json({ error: 'Error fetching buyers' });

//       // Fetch products
//       db.query('SELECT * FROM products', (err, products) => {
//         if (err) return res.status(500).json({ error: 'Error fetching products' });

//         // Fetch orders
//         db.query('SELECT * FROM ordering', (err, orders) => {
//           if (err) return res.status(500).json({ error: 'Error fetching orders' });

//           // Respond with all data
//           res.json({
//             farmers,
//             buyers,
//             products,
//             orders,
//           });
//         });
//       });
//     });
//   });
// });

app.get('/api/report', (req, res) => {
  // Query all relevant data from the database
  db.query('SELECT * FROM farmers', (err, farmers) => {
    if (err) {
      console.error('Error fetching farmers:', err);
      return res.status(500).json({ error: 'Error fetching farmers' });
    }

    const farmersWithDetails = farmers.map(farmer => {
      return new Promise((resolve, reject) => {
        // Fetch farmer's products
        db.query('SELECT * FROM products WHERE farmer_id = ?', [farmer.id], (err, products) => {
          if (err) {
            reject(err);
          } else {
            // Fetch farmer's orders
            db.query('SELECT * FROM ordering WHERE farmer_id = ?', [farmer.id], (err, orders) => {
              if (err) {
                reject(err);
              } else {
                resolve({ farmer, products, orders });
              }
            });
          }
        });
      });
    });

    Promise.all(farmersWithDetails)
      .then(farmerData => {
        // Fetch buyers data
        db.query('SELECT * FROM buyers', (err, buyers) => {
          if (err) {
            console.error('Error fetching buyers:', err);
            return res.status(500).json({ error: 'Error fetching buyers' });
          }

          // Send the combined response
          res.json({ farmers: farmerData, buyers, products: farmerData.flatMap(data => data.products), orders: farmerData.flatMap(data => data.orders) });
        });
      })
      .catch(err => {
        console.error('Error fetching farmer details:', err);
        res.status(500).json({ error: 'Error fetching farmer details' });
      });
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
