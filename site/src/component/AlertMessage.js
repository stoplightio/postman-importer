import React, {Component} from 'react'
import '../App.css'
import {Alert} from 'react-bootstrap'

class AlertMessage extends Component {

    render() {
        if (this.props.alertState) {
            setTimeout(() => this.handleAlertDismiss(), 5000)
            return (
                <Alert bsStyle="danger" onDismiss={this.handleAlertDismiss.bind(this)}>
                    <h4>Oh snap! You got an error!</h4>
                    <p>{this.props.message}</p>
                </Alert>
            );
        }
        return null
    }

    handleAlertDismiss() {
        this.props.changeAlertState()
    }
}

export default AlertMessage