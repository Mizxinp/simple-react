const RENDER_TO_DOM = Symbol('render to dom')

export class Component {
    constructor() {
        this.props = Object.create(null)
        this.children = []
        this._root = null
        this._range = null
    }
    setAttribute(name, value) {
        this.props[name] = value
    }
    appendChild(component) {
        this.children.push(component)
    }
    get vdom() {
        return this.render().vdom
    }
    // 用Symbol表示该方法私有
    [RENDER_TO_DOM](range) {
        this._range = range
        this._vdom = this
        this.render()[RENDER_TO_DOM](range)
    }
    update() {
        let isSameNode = (oldNode, newNode) => {
            // 类型不同
            if (oldNode.type !== newNode.type) {
                return false
            }
            // 属性不同
            for (let name in newNode.props) {
                if (newNode.props[name] !== oldNode.props[name]) {
                    return false
                }
            }
            // props不同
            if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length) {
                return false
            }
            // 文本不同
            if (newNode.type === '#text') {
                if (newNode.content !== oldNode.content) {
                    return false
                }
            }
            return true
        }
        let update = (oldNode, newNode) => {
            // 检测type, props(如果type, props相同则不更新根结点)
            // #text content（children对比）
            if (!isSameNode(oldNode, newNode)) {
                newNode[RENDER_TO_DOM](oldNode._range)
                return
            }
            newNode._range = oldNode._range

            // 处理children
            let newChildren = newNode.vchildren
            let oldChildren = oldNode.vchildren

            if (!newChildren || !newChildren.length) {
                return
            }

            let tailRange = oldChildren[oldChildren.length - 1]._range

            for (let i = 0; i < newChildren.length; i++) {
                let newChild = newChildren[i]
                let oldChild = oldChildren[i]
                if (i < oldChildren.length) {
                    update(oldChild, newChild)
                } else {
                    let range = document.createRange()
                    range.setStart(tailRange.endContainer, tailRange.endOffset)
                    range.setEnd(tailRange.endContainer, tailRange.endOffset)
                    newChild[RENDER_TO_DOM](range)
                    tailRange = range
                }
            }
        }
        let vdom = this.vdom
        update(this._vdom, vdom)
        this._vdom = vdom
    }
    /* rerender() {
        let oldRange = this._range

        let range = document.createRange()
        range.setStart(oldRange.startContainer, oldRange.startOffset)
        range.setEnd(oldRange.startContainer, oldRange.startOffset)
        this[RENDER_TO_DOM](range)

        oldRange.setStart(range.endContainer, range.endOffset)
        oldRange.deleteContents()
    }*/
    setState(newState) {
        if (this.state === null || typeof this.state !== 'object') {
            this.state = newState;
            this.update()
            return
        }

        let merge = (oldState, newState) => {
            for (let p in newState) {
                if (oldState[p] === null || typeof oldState[p] !== 'object') {
                    oldState[p] = newState[p]
                } else {
                    merge(oldState[p], newState[p])
                }
            }
        }
        merge(this.state, newState)
        this.update()
    }
}

class ElementWrapper extends Component{
    constructor(type) {
        super(type)
        this.type = type
    }
    /*
    setAttribute(name, value) {
        if (name.match(/^on([\s\S]+)$/)) {
            // this.root.addEventListener(RegExp.$1.replace(/^[/s/S]/, c => c.toLowerCase()), value)
            this.root.addEventListener(RegExp.$1.toLowerCase(), value)
        } else {
            if (name === 'className') {
                this.root.setAttribute('class', value)
            } else {
                this.root.setAttribute(name, value)
            }
        }
    }
    appendChild(component) {
        let range = document.createRange()
        range.setStart(this.root, this.root.childNodes.length)
        range.setEnd(this.root, this.root.childNodes.length)
        component[RENDER_TO_DOM](range)
    }
    */
    get vdom() {
        this.vchildren = this.children.map(child => child.vdom)
        return this
        // return {
        //     type: this.type,
        //     props: this.props,
        //     children: this.children.map(child => child.vdom),
        // }
    }
    // get vchildren() {
    //     return this.children.map(child => child.vdom)
    // }
    [RENDER_TO_DOM](range) {
        this._range = range
    
        // 处理setAttribute和appendChild操纵
        let root = document.createElement(this.type)
        // setAttribute
        for (let name in this.props) {
            let value = this.props[name]
            if (name.match(/^on([\s\S]+)$/)) {
                // this.root.addEventListener(RegExp.$1.replace(/^[/s/S]/, c => c.toLowerCase()), value)
                root.addEventListener(RegExp.$1.toLowerCase(), value)
            } else {
                if (name === 'className') {
                    root.setAttribute('class', value)
                } else {
                    root.setAttribute(name, value)
                }
            }
        }

        if (!this.vchildren) {
            this.vchildren = this.children.map(child => child.vdom)
        }

        for (let child of this.vchildren) {
            let childrenRange = document.createRange()
            childrenRange.setStart(root, root.childNodes.length)
            childrenRange.setEnd(root, root.childNodes.length)
            child[RENDER_TO_DOM](childrenRange)
        }

        replaceContent(range, root)
    }
}

class TextWrapper extends Component {
    constructor(content) {
        super(content)
        this.type = '#text'
        this.content = content
    }
    get vdom() {
        return this
        // return {
        //     type: '#text',
        //     content: this.content
        // }
    }
    [RENDER_TO_DOM](range) {
        this._range = range
        let root = document.createTextNode(this.content)
        replaceContent(range, root)
    }
}

function replaceContent(range, node) {
    range.insertNode(node)
    range.setStartAfter(node)
    range.deleteContents()

    range.setStartBefore(node)
    range.setEndAfter(node)
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
            if (child === null) {
                continue
            }
            if ((typeof child === 'object') && (child instanceof Array)) {
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
    let range = document.createRange()
    range.setStart(parentElement, 0)
    range.setEnd(parentElement, parentElement.childNodes.length)
    range.deleteContents()
    component[RENDER_TO_DOM](range)
}