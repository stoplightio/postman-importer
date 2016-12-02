import React, { Component } from 'react'
import AceEditor from 'react-ace'

import 'brace/mode/json'
import 'brace/theme/github'
import 'brace/mode/yaml'

export const mode = "json"

class CodeEditor extends Component {

    shouldComponentUpdate(nextProps, nextState){
        return false
    }

    render() {
        return <AceEditor mode={mode}
                          theme="github"
                          name={this.props.name}
                          width={"100%"}
                          height={"90vh"}
                          setOptions={{printMargin: false, wrap: true}}
                          onChange={this.props.autoMode}/>
    }
}

export default CodeEditor