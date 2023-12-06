var express = require('express');
const { isLoggedIn } = require('../helpers/util');
var router = express.Router();


module.exports = function (db) {
  router.get('/', isLoggedIn, async function (req, res, next) {
    const { page = 1, title, strDate, endDate, Operator, complete, sortBy } = req.query
    const queries = []
    const params = []
    const paramscount = []
    const limit = 5
    const offset = (page - 1) * 5
    let sortMode;
    const {rows : profil} = await db.query(`SELECT * FROM todos WHERE userid = $1`, [req.session.user.userid])

    if (title) {
      queries.push(`title ILIKE '%' || $${params.length} || '%'`);
      params.push(title)
      paramscount.push(title)
    }
    if (strDate && endDate) {
      queries.push(`deadline BETWEEN $${params.length - 1} AND $${params.length}`);
      params.push(strDate, endDate)
      paramscount.push(strDate, endDate)

    } else if (strDate) {
      queries.push(`deadline >= $${params.length}`);
      params.push(strDate)
      paramscount.push(strDate)
    } else if (endDate) {
      queries.push(`deadline <= $${params.length}`);
      params.push(endDate)
      paramscount.push(endDate)
    }
    if (complete) {
      queries.push(`complete = $${params.length}`);
      params.push(complete)
      paramscount.push(complete)
    }
    let sqlcount = 'SELECT COUNT (*) as total FROM todos';
    let sql = 'SELECT * FROM todos'
    if (queries.length > 0) {
      sql += ` WHERE ${queries.join(`${Operator} `)}`
      sqlcount += ` WHERE ${queries.join(`${Operator} `)}`
    }

    params.push(sortBy)
    sql += `ORDER BY $${sortBy} ${sortMode}`
    // console.log(sql, params)
    sql += ` ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2} `;
    params.push(limit, offset)


    db.query(sqlcount, paramscount, (err, data) => {
      if (err) res.send(err)
      else {
        const total = data.total;
        const pages = Math.ceil(total / limit);
        db.query(sql, params, (err, data) => {
          if (err) res.render(err)
          else res.render('todos', { data, query: req.query, pages, offset, page, url: req.url, user: req.session.user })

        })
      }
    })
  });

  router.get('/add', isLoggedIn, (req, res) => {
    res.render('form', { data: {} })
  })
  router.post('/add', isLoggedIn, (req, res) => {
    db.query('INSERT INTO todos(title,userid) values ($1, $2)', [req.body.title, req.session.userid], (err) => {
      if (err) return res.send(err)
      res.redirect('/')
    })
  })
  router.get('/edit/:index', isLoggedIn,(req,res) =>{
    const index = req.params.index;
    db.query(`SELECT * FROM todos WHERE id = $1`, [index], (err,{rows : data})=>{
      if(err) res.send(err)
      else res.render('user/edit', {data, moment})
    })
  })

  router.post('/edit/:index', isLoggedIn, (req,res) =>{
    const index = req.params.index;
    const {title, deadline, complete} = req.body
    db.query(`UPDATE todos SET title = $1, complete = $2, deadline = $3 WHERE id = $4 `, 
    [title, Boolean(complete), deadline, index ], (err, data) =>{
      if(err){
        res.send(err)
      } else res.redirect('/')
    })
  })


  return router
}