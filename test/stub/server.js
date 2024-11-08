/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/**
 * @file Express server stub
 *
 * Start:
 */


const express = require('express');

const app = express();
app.set('port', process.env.PORT || 3333);

app.options('/machines', function(req, res) {
  'use strict';
  const allow = ['OPTIONS', 'HEAD', 'GET'];
  const directives = ['no-cache', 'no-store', 'must-revalidate'];
  res.setHeader('Allow', allow.join(','));
  res.setHeader('Cache-Control', directives.join(','));
  res.setHeader('Pragma', directives[0]);
  res.setHeader('Expires', '0');
  return res.status(204).end();
});

app.get('/machines', function(req, res) {
  'use strict';
  const machine = {
    type: 'bulldozer',
    name: 'willy'
  };
  return res.status(200).json([machine]);
});

app.use(function(err, req, res, next) {
  'use strict';
  res.status(err.status || 500)
    .json({
      message: err.message,
      stack: err.stack
    });
});

var server = app.listen(app.get('port'), function() {
  'use strict';
  return console.log('server listening on port', server.address().port);
});

