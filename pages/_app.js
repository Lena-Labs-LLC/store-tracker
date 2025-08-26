import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Import Bootstrap JS on client side
    import('bootstrap/dist/js/bootstrap.bundle.min.js')
  }, [])

  return <Component {...pageProps} />
}