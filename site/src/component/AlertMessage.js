import React, {Component} from 'react'
import '../App.css'
import {Alert} from 'react-bootstrap'

class AlertMessage extends Component {

  constructor() {
    super();
    this.state = {
      showDetail: false
    }
  }

  render() {
    if (this.props.alertState) {
      if (!this.props.detail) {
        return (
          <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss.bind(this)}>
            {this.props.message}
          </Alert>
        )
      }
      else if (this.state.showDetail) {
        return (
          <div>
            <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss.bind(this)}>
              {this.props.message} <a href="#" onClick={this.handleDetail.bind(this)}> (hide details) </a>
            </Alert>
            <pre>{this.props.detail}</pre>
          </div>
        )
      } else {
        return (
          <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss.bind(this)}>
            {this.props.message} <a href="#" onClick={this.handleDetail.bind(this)}> (show details) </a>
          </Alert>
        )
      }
    }
    return null
  }

  handleDetail() {
    this.setState({showDetail: !this.state.showDetail})
  }

  handleAlertDismiss() {
    this.props.changeAlertState()
  }
}

export default AlertMessage