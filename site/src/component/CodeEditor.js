import React, { Component } from 'react'
import AceEditor from 'react-ace'

import 'brace/mode/json'
import 'brace/mode/yaml'
import 'brace/theme/github'
import 'brace/theme/monokai'
import 'brace/theme/tomorrow'
import 'brace/theme/kuroir'
import 'brace/theme/twilight'
import 'brace/theme/xcode'
import 'brace/theme/textmate'
import 'brace/theme/terminal'

class CodeEditor extends Component {

    shouldComponentUpdate(nextProps, nextState){
        return false
    }

    render() {
        return <AceEditor mode="json"
                          theme="github"
                          name={this.props.name}
                          width={"100%"}
                          height={"100%"}
                          setOptions={{printMargin: false, wrap: true}}
                          onChange={this.props.autoMode}/>
    }
}

export default CodeEditor