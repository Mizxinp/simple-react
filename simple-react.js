class ElementWrapper {
    constructor(type) {
        this.root = document.createElement(type)
    }
    setAttribute(name, value) {
        this.root.setAttribute(name, value)
    }
    appendChild(component) {
        this.root.appendChild(component.root)
    }
}

class TextWrapper {
    constructor(content) {
        this.root = document.createTextNode(content)
    }
}

export class Component {
    constructor() {
        this.props = Object.create(null)
        this.children = []
        this._root = null
    }
    setAttribute(name, value) {
        this.props[name] = value
    }
    appendChild(component) {
        this.children.push(component)
    }
    get root() {
        if(!this._root) {
            this._root = this.render().root
        }
        return this._root
    }
}

export function createElement(type, attributes, ...children) {
    let element
    if (typeof type === 'string') {
        element = new ElementWrapper(type)
    } else {
        element = new type
    }

    for (let p in attributes) {
        element.setAttribute(p, attributes[p])
    }
    
    let insertChildren = (children) => {
        for (let child of children) {
            if (typeof child === 'string') {
                child = new TextWrapper(child)
            }
            if (typeof child === 'object' && child instanceof Array) {
                insertChildren(child)
            } else {
                element.appendChild(child)
            }
        }
    }
    insertChildren(children)
    
    return element
}

export function render(component, parentElement) {
    parentElement.appendChild(component.root)
}