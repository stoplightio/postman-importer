import React, {Component} from 'react'
import '../App.css'
import {DropdownButton, MenuItem, Col, Button, Row} from 'react-bootstrap'
import supportedFormats from './../../../src/formats'

const importOptions = Object.keys(supportedFormats).map(k => supportedFormats[k]).filter(v => v.import)
const exportOptions = Object.keys(supportedFormats).map(k => supportedFormats[k]).filter(v => v.export)

console.log(importOptions)
console.log(exportOptions)


class Toolbar extends Component {

    static from = "from"
    static to = "to"
    static defaultMessage = "Select"
    static AUTO = "AUTO"

    constructor(props) {
        super(props)

        this.state = {
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
    }

    renderOptions(options, selected) {
        return options.map((option, index) => (
            <MenuItem key={index}
                      eventKey={index}
                      active={selected.index === index}>
                {option.name}
            </MenuItem>
        ))
    }

    static renderFormats(formats) {
        return formats.map((option, index) => (
            <MenuItem key={index} eventKey={index}> {option} </MenuItem>
        ))
    }

    handleFromSelection(eventKey) {
        let newOption = importOptions[eventKey]
        this.setState({
            fromSelectionObj: {
                name: newOption.name,
                index: eventKey,
                formats: newOption.formats,
                selectedFormat: newOption.formats[0]
            }
        })
        this.props.changeMode(true, newOption.formats[0].toLowerCase())
        this.props.autoMode(newOption.name.toUpperCase() === Toolbar.AUTO)
    }

    handleToSelection(eventKey) {
        let newOption = exportOptions[eventKey]
        this.setState({
            toSelectionObj: {
                name: newOption.name,
                index: eventKey,
                formats: newOption.formats,
                selectedFormat: newOption.formats[0]
            }
        })
        this.props.changeMode(false, newOption.formats[0].toLowerCase())
    }

    handleFromFormatSelection(eventKey) {
        let from = this.state.fromSelectionObj
        from.selectedFormat = from.formats[eventKey]
        this.setState({ fromSelectionObj: from })
        this.props.changeMode(true, from.selectedFormat)
    }

    handleToFormatSelection(eventKey) {
        let to = this.state.toSelectionObj
        to.selectedFormat = to.formats[eventKey]
        this.setState({ toSelectionObj: to })
        this.props.changeMode(false, to.selectedFormat)
    }

    handleConvert() {
        this.props.onConvert(
          importOptions[this.state.fromSelectionObj.index],
          exportOptions[this.state.toSelectionObj.index],
          this.state.toSelectionObj.selectedFormat
        )
    }

    render() {
        return (
            <Row id="appToolbar">
                <Col id="leftToolbar" xs={6}>
                    <span>From specification:</span>
                    <DropdownButton title={this.state.fromSelectionObj.name}
                                    id={Toolbar.from}
                                    bsStyle="primary"
                                    onSelect={this.handleFromSelection.bind(this)}>
                        {this.renderOptions(importOptions, this.state.fromSelectionObj)}
                    </DropdownButton>

                    {this.state.fromSelectionObj.formats.length > 1 ?
                        <DropdownButton title={this.state.fromSelectionObj.selectedFormat}
                                        id={"from-format"}
                                        bsStyle="primary"
                                        onSelect={this.handleFromFormatSelection.bind(this)}>
                            {Toolbar.renderFormats(this.state.fromSelectionObj.formats)}
                        </DropdownButton>
                        : null
                    }
                </Col>
                <Col id="rightToolbar" xs={6}>
                    <span>To specification:</span>
                    <DropdownButton title={this.state.toSelectionObj.name}
                                    id={Toolbar.to}
                                    bsStyle="primary"
                                    onSelect={this.handleToSelection.bind(this)}>
                        {this.renderOptions(exportOptions, this.state.toSelectionObj)}
                    </DropdownButton>

                    {this.state.toSelectionObj.formats.length > 1 ?
                        <DropdownButton title={this.state.toSelectionObj.selectedFormat}
                                        id={"to-format"}
                                        bsStyle="primary"
                                        onSelect={this.handleToFormatSelection.bind(this)}>
                            {Toolbar.renderFormats(this.state.toSelectionObj.formats)}
                        </DropdownButton>
                        : null
                    }

                    <div className="pull-right">
                        <Button bsStyle="success"
                                disabled={this.props.converting || this.state.toSelectionObj.index === -1 || this.state.toSelectionObj.name === this.state.fromSelectionObj.name}
                                onClick={this.handleConvert.bind(this)}>
                            {this.props.converting ? 'Converting...' : 'Convert'}
                        </Button>
                    </div>
                </Col>
            </Row>
        )
    }
}

export default Toolbar