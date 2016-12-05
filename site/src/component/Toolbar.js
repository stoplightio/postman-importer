import React, {Component} from 'react'
import '../App.css'
import {DropdownButton, MenuItem, Col, Button, Row} from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'
import supportedFormats from './../../../lib/formats'

class Toolbar extends Component {

    static from = "from"
    static to = "to"
    static options = []
    static defaultMessage = "Select"

    constructor(props) {
        super(props)

        this.state = {
            isDisable: true,
            fromSelectionObj: {
                name: Toolbar.defaultMessage,
                index: -1,
                formats: [],
                selectedFormat: ""
            },
            toSelectionObj: {
                name: Toolbar.defaultMessage,
                index: -1,
                formats: [],
                selectedFormat: ""
            }
        }

        Toolbar.options = Object.keys(supportedFormats).filter((value, key) => {
            return !supportedFormats[value].deprecated
        }).map((value, key) => {
            if (value.toLowerCase() === "auto") {
                setTimeout(() => this.setState({
                    fromSelectionObj: {
                        name: supportedFormats[value].name,
                        index: key,
                        formats: supportedFormats[value].formats,
                        selectedFormat: supportedFormats[value].formats[0]
                    }
                }), 0)
            }
            return supportedFormats[value]
        })
    }

    renderOptions(options, context) {
        return options.map((option, index) => (
            <MenuItem key={index}
                      eventKey={index}
                      disabled={context === Toolbar.to ? this.state.fromSelectionObj.index === index : this.state.toSelectionObj.index === index}
                      active={context === Toolbar.to ? this.state.toSelectionObj.index === index : this.state.fromSelectionObj.index === index}>
                {option.name}
            </MenuItem>
        ))
    }

    static renderFormats(formats) {
        return formats.map((option, index) => (
            <MenuItem key={index} eventKey={index}> {option} </MenuItem>
        ))
    }

    checkButtonState() {
        if (this.state.fromSelectionObj.index !== -1 && this.state.toSelectionObj.index !== -1) {
            this.setState({isDisable: false})
        }
    }

    handleSelection(context, eventKey) {
        let newOption = Toolbar.options[eventKey]
        if (context !== Toolbar.to) {
            this.setState({
                fromSelectionObj: {
                    name: newOption.name,
                    index: eventKey,
                    formats: newOption.formats,
                    selectedFormat: newOption.formats[0]
                }
            })
            setTimeout(() => this.checkButtonState(), 0)
        } else {
            this.setState({
                toSelectionObj: {
                    name: newOption.name,
                    index: eventKey,
                    formats: newOption.formats,
                    selectedFormat: newOption.formats[0]
                }
            })
            setTimeout(() => this.checkButtonState(), 0)
        }
        this.props.changeMode(context === Toolbar.from, newOption.formats[0].toLowerCase())
        if(context === Toolbar.from) this.props.autoMode(newOption.name.toLowerCase() === 'auto')
    }

    handleFormatSelection(context, eventKey) {
        let oldState = context !== Toolbar.to ? this.state.fromSelectionObj : this.state.toSelectionObj
        if (context !== Toolbar.to) {
            this.setState({
                fromSelectionObj: {
                    name: oldState.name,
                    index: oldState.index,
                    formats: oldState.formats,
                    selectedFormat: oldState.formats[eventKey]
                }
            })
        } else {
            this.setState({
                toSelectionObj: {
                    name: oldState.name,
                    index: oldState.index,
                    formats: oldState.formats,
                    selectedFormat: oldState.formats[eventKey]
                }
            })
        }
        this.props.changeMode(context === Toolbar.from, oldState.formats[eventKey].toLowerCase())
    }

    handleSwipeOptions() {
        let indexToAux = this.state.toSelectionObj.index
        let indexFromAux = this.state.fromSelectionObj.index
        const fromFormat = this.state.toSelectionObj.selectedFormat;
        const toFormat = this.state.fromSelectionObj.selectedFormat;

        this.setState({
            fromSelectionObj: {
                name: Toolbar.options[indexToAux].name,
                index: indexToAux,
                formats: Toolbar.options[indexToAux].formats,
                selectedFormat: fromFormat
            },
            toSelectionObj: {
                name: Toolbar.options[indexFromAux].name,
                index: indexFromAux,
                formats: Toolbar.options[indexFromAux].formats,
                selectedFormat: toFormat
            }
        })
        this.props.changeMode(true, fromFormat.toLowerCase()) //left mode changing
        this.props.changeMode(false, toFormat.toLowerCase()) //right mode changing
    }

    handleConvert() {
        this.props.onConvert(Toolbar.options[this.state.fromSelectionObj.index],
            Toolbar.options[this.state.toSelectionObj.index], this.state.toSelectionObj.selectedFormat)
    }

    render() {
        return (
            <Row id="appToolbar">
                <Col id="leftToolbar" xs={6}>
                    <span>From specification:</span>
                    <DropdownButton title={this.state.fromSelectionObj.name}
                                    id={Toolbar.from}
                                    bsStyle="primary"
                                    onSelect={this.handleSelection.bind(this, Toolbar.from)}>
                        {this.renderOptions(Toolbar.options, Toolbar.from)}
                    </DropdownButton>

                    {this.state.fromSelectionObj.formats.length > 1 ?
                        <DropdownButton title={this.state.fromSelectionObj.selectedFormat}
                                        id={"from-format"}
                                        bsStyle="primary"
                                        onSelect={this.handleFormatSelection.bind(this, Toolbar.from)}>
                            {Toolbar.renderFormats(this.state.fromSelectionObj.formats)}
                        </DropdownButton>
                        : null
                    }

                    <div className="pull-right">
                        <Button bsStyle="default"
                                disabled={this.state.isDisable || this.state.fromSelectionObj.name.toLocaleLowerCase() === 'auto'}
                                onClick={this.handleSwipeOptions.bind(this)}>
                            <FontAwesome name='exchange'/>
                        </Button>
                    </div>
                </Col>
                <Col id="rightToolbar" xs={6}>
                    <span>To specification:</span>
                    <DropdownButton title={this.state.toSelectionObj.name}
                                    id={Toolbar.to}
                                    bsStyle="primary"
                                    onSelect={this.handleSelection.bind(this, Toolbar.to)}>
                        {this.renderOptions(Toolbar.options.filter((option) => {
                            return option.name !== "Auto"
                        }), Toolbar.to)}
                    </DropdownButton>

                    {this.state.toSelectionObj.formats.length > 1 ?
                        <DropdownButton title={this.state.toSelectionObj.selectedFormat}
                                        id={"to-format"}
                                        bsStyle="primary"
                                        onSelect={this.handleFormatSelection.bind(this, Toolbar.to)}>
                            {Toolbar.renderFormats(this.state.toSelectionObj.formats)}
                        </DropdownButton>
                        : null
                    }

                    <div className="pull-right">
                        <Button bsStyle="success"
                                disabled={this.state.isDisable || this.props.converting}
                                onClick={!this.state.isDisable ? this.handleConvert.bind(this) : null}>
                            {this.props.converting ? 'Converting...' : 'Convert'}
                        </Button>
                    </div>
                </Col>
            </Row>
        )
    }
}

export default Toolbar