import express from 'express';

const router = express.Router();

/* GET index page. */
router.get('/', (req, res, next) => {
  res.render('privacypolice', {
    title: 'Privacy Police'
  });
});

export default router;
