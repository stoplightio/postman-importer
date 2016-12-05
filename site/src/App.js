import React, {Component} from 'react'
import './App.css'
import {Col, Row} from 'react-bootstrap'
import Toolbar from './component/Toolbar'
import CodeEditor from './component/CodeEditor'
import ace from 'brace'
import AlertMessage from './component/AlertMessage'
import NavBar from './component/NavBar'

class App extends Component {

    static leftEditorId = "leftEditor"
    static rightEditorId = "rightEditor"

    constructor(props) {
        super(props)

        this.converterWorker = new Worker(`${process.env.PUBLIC_URL}/build/converter-bundle${process.env.NODE_ENV === 'development' ? ".js" : ".min.js"}`)

        this.state = {
            converting: false,
            isAuto: true,
            autoFormat: '',
            showAlert: false
        }

        this.converterWorker.addEventListener('message', (e) => {
            const message = e.data
            switch (message.type) {
                case 'error':
                    this.setState({
                        errorMessage: message.payload,
                        showAlert: true,
                        converting: false
                    })
                    break
                case 'ok':
                    this.handleConvertedData(message.payload)
                    break
                default:
                    break
            }
        }, false)
    }

    renderEditor(name) {
        return <CodeEditor name={name} autoMode={this.state.isAuto ? this.detectMode.bind(this) : null}/>
    }

    detectMode(editorText) {
        const mode = editorText.charAt(0) === '{' ? 'json' : 'yaml'
        this.setState({autoFormat: mode})
        this.changeEditorMode(true, mode)
    }

    handleConvertedData(newValue) {
        this.setState({converting: false})
        const rightEditor = ace.edit(App.rightEditorId)
        rightEditor.setValue(newValue)
        rightEditor.gotoLine(0)
    }

    sendForConvertion(from, to, toFormat) {
        this.setState({converting: true})
        const leftEditor = ace.edit(App.leftEditorId)
        const message = {rawData: leftEditor.getValue(), fromLanguage: from, toLanguage: to, format: toFormat}
        this.converterWorker.postMessage(message)
    }

    changeEditorMode(left, mode) {
        let editor = left ? ace.edit(App.leftEditorId) : ace.edit(App.rightEditorId)
        editor.session.setMode(`ace/mode/${mode}`)
    }

    changeEditorsTheme(theme) {
        let leftEditor = ace.edit(App.leftEditorId)
        let rightEditor = ace.edit(App.rightEditorId)
        leftEditor.setTheme(`ace/theme/${theme}`)
        rightEditor.setTheme(`ace/theme/${theme}`)
    }

    handleDetectionMode(isAuto) {
        this.setState({isAuto: isAuto})
    }

    toggleAlert() {
        this.setState({showAlert: false})
    }

    render() {
        return (
            <div className="app-container">
                <NavBar onTheme={this.changeEditorsTheme}/>

                <Toolbar converting={this.state.converting}
                         onConvert={this.sendForConvertion.bind(this)}
                         changeMode={this.changeEditorMode}
                         autoMode={this.handleDetectionMode.bind(this)}/>

                <div className="alert-container">
                    <AlertMessage message={this.state.errorMessage}
                                  alertState={this.state.showAlert}
                                  changeAlertState={this.toggleAlert.bind(this)}/>
                </div>

                <div className="editors">
                    <Row>
                        <Col id="left" className="editor-container" xs={6}>
                            {this.renderEditor(App.leftEditorId)}
                        </Col>
                        <Col id="right" className="editor-container" xs={6}>
                            {this.renderEditor(App.rightEditorId)}
                        </Col>
                    </Row>
                </div>
            </div>
        );
    }
}

export default App