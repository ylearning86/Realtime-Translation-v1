const app = require('./function_app');

module.exports = async function (context, req) {
  context.res = await new Promise((resolve) => {
    app(req, { 
      json: (data) => {
        resolve({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: data
        });
      },
      status: (code) => ({
        json: (data) => {
          resolve({
            status: code,
            headers: { 'Content-Type': 'application/json' },
            body: data
          });
        }
      }),
      send: (data) => {
        resolve({
          status: 200,
          body: data
        });
      },
      end: () => {
        resolve({
          status: 204,
          body: ''
        });
      }
    });
  });
};
