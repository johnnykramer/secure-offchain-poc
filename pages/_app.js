import { ToastContainer } from 'react-toastify'
import '../styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'

function MyApp({ Component, pageProps }) {
  return (
    <div className="w-full">
      <Component {...pageProps} />
      <ToastContainer />
    </div>
  )
}

export default MyApp
