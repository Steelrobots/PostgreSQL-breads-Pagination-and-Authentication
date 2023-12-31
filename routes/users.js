var express = require('express');
const { isLoggedIn } = require('../helpers/util');
var router = express.Router();
var moment = require('moment');
const path = require('path');


module.exports = function (db) {
  router.get('/', isLoggedIn, async function (req, res, next) {
    const { page = 1, title, strDate, endDate, Operator, complete } = req.query
    const queries = []
    const params = []
    const paramscount = []
    const limit = 5
    const offset = (page - 1) * 5
    const sortBy = ['title', 'complete', 'deadline'].includes(req.query.sortBy) ? req.query.sortBy : 'id'
    const sortMode = req.query.sortMode === 'asc' ? 'asc' : 'desc';
    const { rows: profil } = await db.query(`SELECT * FROM "users" WHERE id = $1`, [req.session.user.userid])

    params.push(req.session.user.userid)
    paramscount.push(req.session.user.userid)

    if (title) {
      params.push(title)
      paramscount.push(title)
      queries.push(`title ILIKE '%' || $${params.length} || '%'`);
    }
    if (strDate && endDate) {
      params.push(strDate, endDate);
      paramscount.push(strDate, endDate);
      queries.push(`deadline BETWEEN $${params.length - 1} and $${params.length}::TIMESTAMP + INTERVAL '1 DAY - 1 SECOND'`);
    } else if (strDate) {
      params.push(strDate);
      paramscount.push(strDate);
      queries.push(`deadline >= $${params.length}`);
    } else if (endDate) {
      params.push(endDate);
      paramscount.push(endDate);
      queries.push(`deadline <= $${params.length}::TIMESTAMP + INTERVAL '1 DAY - 1 SECOND'`);
    };
    if (complete) {
      params.push(complete)
      paramscount.push(complete)
      queries.push(`complete = $${params.length}`);
    }
    let sqlcount = 'SELECT COUNT (*) AS total FROM todos WHERE userid = $1';
    let sql = `SELECT * FROM todos WHERE userid = $1`;
    if (queries.length > 0) {
      sql += ` AND (${queries.join(` ${Operator} `)})`
      sqlcount += ` AND (${queries.join(` ${Operator} `)})`
    }

    sql += ` ORDER BY ${sortBy} ${sortMode}`

    params.push(limit, offset)
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    db.query(sqlcount, paramscount, (err, data) => {
      if (err) res.send(err)
      else {
        const url = req.url == '/' ? `/?page=${page}&sortBy=${sortBy}&sortMode=${sortMode}` : req.url
        const total = data.rows[0].total;
        const pages = Math.ceil(total / limit);
        db.query(sql, params, (err, { rows: data }) => {
          if (err) res.send(err)
          else
            res.render('user/list', { data, query: req.query, moment, pages, offset, page, url, sortMode, sortBy, profil: profil[0] })
        })
      }
    })
  });

  router.get('/add', isLoggedIn, (req, res) => {
    res.render('user/add', { data: {} })
  })
  router.post('/add', isLoggedIn, (req, res) => {
    db.query('INSERT INTO todos(title,userid) values ($1, $2)', [req.body.title, req.session.user.userid], (err) => {
      if (err) return res.send(err)
      res.redirect('/users')
    })
  })
  router.get('/edit/:index', isLoggedIn, (req, res) => {
    const index = req.params.index;
    db.query(`SELECT * FROM todos WHERE id = $1`, [index], (err, { rows: data }) => {
      if (err) res.send(err)
      else res.render('user/edit', { data, moment })
    })
  })

  router.post('/edit/:index', isLoggedIn, (req, res) => {
    const index = req.params.index;
    const { title, deadline, complete } = req.body
    db.query(`UPDATE todos SET title = $1, complete = $2, deadline = $3 WHERE id = $4 `,
      [title, Boolean(complete), deadline, index], (err, data) => {
        if (err) {
          res.send(err)
        } else res.redirect('/users')
      })
  })

  router.get('/delete/:index', isLoggedIn, (req, res) => {
    const index = req.params.index;
    db.query(`DELETE FROM todos WHERE id = $1`, [index], (err) => {
      if (err) res.send(err)
      else res.redirect('/users')
    })
  })
  router.get('/upload', isLoggedIn, async (req, res) => {
    const { rows: profil } = await db.query(`SELECT * FROM "users" WHERE id = $1`, [req.session.user.userid])
    res.render('user/upload', { avatar: profil[0].avatar })
  })
  router.post('/upload', isLoggedIn, (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    const avatar = req.files.avatar;
    const fileName = `${Date.now()}-${avatar.name}`
    uploadPath = path.join(__dirname, '..', 'public', 'images', fileName);

    // Use the mv() method to place the file somewhere on your server
    avatar.mv(uploadPath, async function (err) {
      if (err)
        return res.status(500).send(err);
      avatar.mv(uploadPath, async function (err) {
        if (err)
          return res.status(500).send(err);
        try {
          const { rows } = await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [fileName, req.session.user.userid])
          res.redirect('/users')
        } catch (err) {
          res.send(err)
        }
      });
    })
  });
  return router
}
