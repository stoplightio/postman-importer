import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import NavBar from './component/NavBar'
import './index.css'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/css/bootstrap-theme.css'

ReactDOM.render(
  <App/>,
  document.getElementById('content')
)

ReactDOM.render(
  <NavBar/>,
  document.getElementById('nav')
)