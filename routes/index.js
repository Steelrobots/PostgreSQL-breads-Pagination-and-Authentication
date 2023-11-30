var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = function (db) {
  router.get("/", (req, res) => {
    res.render("index");
  });

  router.post('/' , async function(req,res) {
    try {
      const {email,password} =req.body;
      const { rows } = await db.query(`SELECT * FROM "users" WHERE email = $1`, [email]);
      if(rows.length == 0){
        console.log(`email doesn't exist`)
        res.redirect('/')
      } else{
        if(!bcrypt.compareSync(password, rows[0].password)){
          console.log(`password doesn't match`)
          res.redirect('/')
        } else{
          res.send('Login berhasil')
        }
      }
    } catch (error) {
      
    }
    

  })

  router.get("/register", (req, res) => {
    res.render("register");
  });

  router.post("/register", async (req, res) => {
    const { email, password, repassword } = req.body;
    if (password !== repassword) {
      throw Error(`password doesn't match`)

      res.redirect('/register')
    } else {
      const hash = bcrypt.hashSync(password, saltRounds);
      try {
        const { rows } = await db.query(`SELECT * FROM "users" WHERE email = $1`, [email]);
        console.log(rows);
        if (rows.length>0){
          req.flash('failedInfo', "Email already exist")
          res.redirect('/register')
        } else{
        await db.query(`INSERT INTO "users"(email,password) values ($1,$2)`, [email, hash]);
        res.redirect("/");}
      } catch (e) {
        console.log(e);
        res.redirect("/register");
      }
    }
  });
  return router;
};
