import React, {Component} from 'react';
import '../App.css';
import {Navbar, Nav, NavItem, NavDropdown, MenuItem} from 'react-bootstrap';
import FontAwesome from 'react-fontawesome'

class NavBar extends Component {

    constructor(props){
        super(props)

        this.themes = ["monokai", "github", "tomorrow", "kuroir", "twilight", "xcode", "textmate", "terminal"]

        this.state = {
            themeIndex: 1
        }
    }

    render() {
        return (
            <Navbar id="app-navbar" inverse fluid={true}>
                <Navbar.Header>
                    <Navbar.Brand>
                        <a>API Spec Converter</a>
                    </Navbar.Brand>
                    <Navbar.Toggle/>
                </Navbar.Header>
                <Navbar.Collapse>
                    <Nav>
                        <NavDropdown onSelect={this.handleThemeSelection.bind(this)} title="Change theme" id="theme">
                            {this.renderThemes()}
                        </NavDropdown>
                    </Nav>
                    <Nav pullRight>
                        <NavItem href="https://github.com/mulesoft/api-spec-converter">
                            <FontAwesome name='code-fork'/> Fork Me
                        </NavItem>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        );
    }

    renderThemes() {
        return this.themes.map((theme, index) => (
            <MenuItem key={index} eventKey={index} disabled={this.state.themeIndex === index}> {theme} </MenuItem>
        ))
    }

    handleThemeSelection(idSelected) {
        this.setState({themeIndex: idSelected})
        this.props.onTheme(this.themes[idSelected])
    }
}

export default NavBar;

