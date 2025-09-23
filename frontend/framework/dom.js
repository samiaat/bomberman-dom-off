import { applyEventHandlers } from './event.js';


export const createElement = (tag, props, ...children) => {
  return {
    tag,
    props: props || {},
    children: children.flat(),
  };
};


export const render = (vnode) => {
  if (vnode === null || vnode === undefined || typeof vnode === 'boolean') {
    return document.createTextNode('');
  }

  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(vnode.toString());
  }

  if (typeof vnode.tag === 'function') {
    return render(vnode.tag({ ...vnode.props, children: vnode.children }));
  }

  const { tag, props, children } = vnode;

  const element = document.createElement(tag);

  applyEventHandlers(element, props);

  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) {
      continue; 
    }

    if (key === 'ref') {
      if (typeof value === 'function') {
        value(element);
      }
    } else if (key === 'checked' || key === 'value' || key === 'disabled' || key === 'autofocus') {
      element[key] = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    element.appendChild(render(child));
  }

  return element;
};


export const mount = (node, target) => {
  target.innerHTML = '';
  target.appendChild(node);
  return node;
};


function patchProps(el, oldProps, newProps) {
  if (oldProps === newProps) return;
  oldProps = oldProps || {};
  newProps = newProps || {};

  for (const key in newProps) {
    if (newProps.hasOwnProperty(key)) {
      const oldValue = oldProps[key];
      const newValue = newProps[key];
      if (newValue !== oldValue) {
        if (key.startsWith('on') && typeof newValue === 'function') {
          el[key.toLowerCase()] = newValue;
        } else if (key === 'ref' && typeof newValue === 'function') {
          newValue(el);
        } else if (key === 'checked' || key === 'value' || key === 'disabled' || key === 'autofocus') {
          el[key] = newValue;
        } else if (newValue != null) {
          el.setAttribute(key, newValue);
        }
      }
    }
  }

  for (const key in oldProps) {
    if (oldProps.hasOwnProperty(key) && !newProps.hasOwnProperty(key)) {
      if (key.startsWith('on')) {
        el[key.toLowerCase()] = null;
      } else if (key !== 'ref') {
        el.removeAttribute(key);
      }
    }
  }
}

function patch(parentEl, oldVNode, newVNode, index = 0) {
    const el = parentEl.childNodes[index];

    if (newVNode === undefined) {
        el.remove();
        return;
    }

    if (oldVNode === undefined) {
        parentEl.appendChild(render(newVNode));
        return;
    }

    // If it's a component, we diff its rendered output
    if (typeof oldVNode.tag === 'function' || typeof newVNode.tag === 'function') {
        const oldRendered = typeof oldVNode?.tag === 'function' ? oldVNode.tag(oldVNode.props) : oldVNode;
        const newRendered = typeof newVNode?.tag === 'function' ? newVNode.tag(newVNode.props) : newVNode;
        patch(parentEl, oldRendered, newRendered, index);
        return;
    }

    if (typeof oldVNode !== typeof newVNode || (typeof oldVNode === 'string' && oldVNode !== newVNode) || oldVNode.tag !== newVNode.tag) {
        el.replaceWith(render(newVNode));
        return;
    }

    patchProps(el, oldVNode.props, newVNode.props);
    patchChildren(el, oldVNode.children || [], newVNode.children || []);
}

function patchChildren(parentEl, oldChildren, newChildren) {
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;
    const commonLen = Math.min(oldLen, newLen);

    for (let i = 0; i < commonLen; i++) {
        patch(parentEl, oldChildren[i], newChildren[i], i);
    }

    if (oldLen > newLen) {
        for (let i = oldLen - 1; i >= newLen; i--) {
            parentEl.childNodes[i].remove();
        }
    }
    else if (newLen > oldLen) {
        for (let i = oldLen; i < newLen; i++) {
            parentEl.appendChild(render(newChildren[i]));
        }
    }
}

export const createApp = (component, target) => {
    let currentVNode = component();
    let rootNode = render(currentVNode);
    mount(rootNode, target);

    return () => {
        const newVNode = component();
        patch(target, currentVNode, newVNode);
        currentVNode = newVNode;
    };
};
