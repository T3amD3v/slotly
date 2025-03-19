const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    
    // Ensure auth routes are properly handled
    if (parsedUrl.pathname.startsWith('/api/auth')) {
      console.log('Auth route requested:', parsedUrl.pathname)
      
      // Set appropriate headers for auth routes
      res.setHeader('Cache-Control', 'no-store, max-age=0')
      
      // If this is a session or callback endpoint, ensure content type is correct
      if (parsedUrl.pathname.includes('/session') || parsedUrl.pathname.includes('/callback')) {
        res.setHeader('Content-Type', 'application/json')
      }
    }
    
    handle(req, res, parsedUrl)
  }).listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })
}) 