import React, { Component } from 'react';
import '../App.css';
import { Navbar } from 'react-bootstrap';

class NavBar extends Component {
    render() {
        return (
            <Navbar inverse>
                <Navbar.Header>
                    <Navbar.Brand>
                        <a>Conversions</a>
                    </Navbar.Brand>
                </Navbar.Header>
            </Navbar>
        );
    }
}

export default NavBar;

