var express = require("express");
var userHelper = require("../helper/userHelper");
var router = express.Router();
var fs = require("fs");

const verifySignedIn = (req, res, next) => {
  if (req.session.signedIn) {
    next();
  } else {
    res.redirect("/signin");
  }
};

/* GET home page. */
router.get("/", verifySignedIn, async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  if (user) {
    let userId = req.session.user._id;
    cartCount = await userHelper.getCartCount(userId);
  }
  userHelper.getAllProducts().then((products) => {
    res.render("users/home", { admin: false, products, user, cartCount });
  });
});


///////ALL project/////////////////////                                         
router.get("/all-projects", verifySignedIn, function (req, res) {
  let user = req.session.user;
  userHelper.getAllprojects().then((projects) => {
    res.render("users/projects/all-projects", { admin: false, layout: "innerlayout", projects, user });
  });
});

///////ADD projects/////////////////////                                         
router.get("/add-project", verifySignedIn, function (req, res) {
  let user = req.session.user;
  res.render("users/projects/add-project", { admin: false, layout: "innerlayout", user });
});

///////ADD projects/////////////////////                                         
router.post("/add-project", function (req, res) {
  userHelper.addproject(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/images/project-images/" + id + ".png", (err, done) => {
      if (!err) {
        res.redirect("/users/projects/all-projects");
      } else {
        console.log(err);
      }
    });
  });
});

///////EDIT projects/////////////////////                                         
router.get("/edit-project/:id", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let projectId = req.params.id;
  let project = await userHelper.getprojectDetails(projectId);
  console.log(project);
  res.render("users/projects/edit-project", { admin: false, layout: "innerlayout", project, user });
});

///////EDIT projects/////////////////////                                         
router.post("/edit-project/:id", verifySignedIn, function (req, res) {
  let projectId = req.params.id;
  userHelper.updateproject(projectId, req.body).then(() => {
    if (req.files) {
      let image = req.files.Image;
      if (image) {
        image.mv("./public/images/project-images/" + projectId + ".png");
      }
    }
    res.redirect("/users/projects/all-projects");
  });
});

///////DELETE projects/////////////////////                                         
router.get("/delete-project/:id", verifySignedIn, function (req, res) {
  let projectId = req.params.id;
  userHelper.deleteproject(projectId).then((response) => {
    fs.unlinkSync("./public/images/project-images/" + projectId + ".png");
    res.redirect("/users/projects/all-projects");
  });
});

///////DELETE ALL projects/////////////////////                                         
router.get("/delete-all-projects", verifySignedIn, function (req, res) {
  userHelper.deleteAllprojects().then(() => {
    res.redirect("/users/projects/all-projects");
  });
});







router.get("/signup", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signup", { admin: false, layout: "emptylayout" });
  }
});

router.post("/signup", function (req, res) {
  userHelper.doSignup(req.body).then((response) => {
    req.session.signedIn = true;
    req.session.user = response;
    res.redirect("/");
  });
});

router.get("/signin", function (req, res) {
  if (req.session.signedIn) {
    res.redirect("/");
  } else {
    res.render("users/signin", {
      admin: false,
      layout: "emptylayout",
      signInErr: req.session.signInErr,
    });
    req.session.signInErr = null;
  }
});

router.post("/signin", function (req, res) {
  userHelper.doSignin(req.body).then((response) => {
    if (response.status) {
      req.session.signedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.signInErr = "Invalid Email/Password";
      res.redirect("/signin");
    }
  });
});

router.get("/signout", function (req, res) {
  req.session.signedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/cart", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  let cartProducts = await userHelper.getCartProducts(userId);
  let total = null;
  if (cartCount != 0) {
    total = await userHelper.getTotalAmount(userId);
  }
  res.render("users/cart", {
    admin: false,
    user,
    cartCount,
    cartProducts,
    total,
  });
});

router.get("/add-to-cart/:id", function (req, res) {
  console.log("api call");
  let productId = req.params.id;
  let userId = req.session.user._id;
  userHelper.addToCart(productId, userId).then(() => {
    res.json({ status: true });
  });
});

router.post("/change-product-quantity", function (req, res) {
  console.log(req.body);
  userHelper.changeProductQuantity(req.body).then((response) => {
    res.json(response);
  });
});

router.post("/remove-cart-product", (req, res, next) => {
  userHelper.removeCartProduct(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/place-order", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  let total = await userHelper.getTotalAmount(userId);
  res.render("users/place-order", { admin: false, user, cartCount, total });
});

router.post("/place-order", async (req, res) => {
  let user = req.session.user;
  let products = await userHelper.getCartProductList(req.body.userId);
  let totalPrice = await userHelper.getTotalAmount(req.body.userId);
  userHelper
    .placeOrder(req.body, products, totalPrice, user)
    .then((orderId) => {
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelper.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    });
});

router.post("/verify-payment", async (req, res) => {
  console.log(req.body);
  userHelper
    .verifyPayment(req.body)
    .then(() => {
      userHelper.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
    .catch((err) => {
      res.json({ status: false, errMsg: "Payment Failed" });
    });
});

router.get("/order-placed", verifySignedIn, async (req, res) => {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  res.render("users/order-placed", { admin: false, user, cartCount });
});

router.get("/orders", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  let orders = await userHelper.getUserOrder(userId);
  res.render("users/orders", { admin: false, user, cartCount, orders });
});

router.get(
  "/view-ordered-products/:id",
  verifySignedIn,
  async function (req, res) {
    let user = req.session.user;
    let userId = req.session.user._id;
    let cartCount = await userHelper.getCartCount(userId);
    let orderId = req.params.id;
    let products = await userHelper.getOrderProducts(orderId);
    res.render("users/order-products", {
      admin: false,
      user,
      cartCount,
      products,
    });
  }
);

router.get("/cancel-order/:id", verifySignedIn, function (req, res) {
  let orderId = req.params.id;
  userHelper.cancelOrder(orderId).then(() => {
    res.redirect("/orders");
  });
});

router.post("/search", verifySignedIn, async function (req, res) {
  let user = req.session.user;
  let userId = req.session.user._id;
  let cartCount = await userHelper.getCartCount(userId);
  userHelper.searchProduct(req.body).then((response) => {
    res.render("users/search-result", { admin: false, user, cartCount, response });
  });
});

module.exports = router;
