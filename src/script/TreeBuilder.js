var NS_SVG = "http://www.w3.org/2000/svg";
var GROUP_BASE_ID = "group-";
var LINK_BASE_ID = "link_";
var ANCHOR_BASE_ID = "anchor-";
var CLASS_SELECTED = "selected";

var propertiesEditor;
var dispatchers = {};
var links = {};
var last_block = "";
var svg;
var type_list = {
    "diagnostic":"D&eacute;marche diagnostique",
    "reflexion": "&Eacute;valuation",
    "treatment": "Traitement"
};

var Context = {
    getScroll:function()
    {
        var scroll = {x:0, y:0};
        var p = svg;
        while(p)
        {
            scroll.x += p.scrollLeft||0;
            scroll.y += p.scrollTop||0;
            p = p.parentNode;
        }
        return scroll;
    }
};

function Draggable(pElement)
{
    this._setupDraggable(pElement);
}

Class.define(Draggable, [EventDispatcher], {
    _setupDraggable:function(pElement)
    {
        this.removeAllEventListener();
        this.element = pElement;
        this.element.classList.add("draggable");
        this.options = this._parseOptions(this.element.getAttribute("data-draggable"));
        this.relativePointer = {x:0, y:0};
        this.centerRelativePointer = this.element.nodeName.toLowerCase() === "circle";
        this.element.addEventListener("mousedown", this._startDragHandler.proxy(this), false);
        this.__dropHandler = this._dropHandler.proxy(this);
        this.__dragHandler = this._dragHandler.proxy(this);
        if(this.options.restraintTo)
        {
            dispatchers[this.options.restraintTo[0]].addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._updateConstraint.proxy(this), false);
            dispatchers[this.options.restraintTo[0]].addEventListener(InteractiveEvent.REMOVED, this.remove.proxy(this), false);
            this._updateConstraint();
        }
    },
    _startDragHandler:function(e)
    {
        if(svg.classList.contains("frozen"))
            return;

        this.relativePointer.x = e.clientX - this.getX();
        this.relativePointer.y = e.clientY - this.getY();
        if(this.centerRelativePointer)
        {
            this.relativePointer.x -= (this.getWidth()>>1);
            this.relativePointer.y -= (this.getHeight()>>1);
        }
        document.addEventListener("mouseup", this.__dropHandler, false);
        document.addEventListener("mousemove", this.__dragHandler, false);
    },
    _dropHandler:function()
    {
        document.removeEventListener("mouseup", this.__dropHandler, false);
        document.removeEventListener("mousemove", this.__dragHandler, false);
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    _dragHandler:function(e)
    {
        var restraint = this.options.restraintTo;
        var s = Context.getScroll();
        var p = {x: e.clientX - this.relativePointer.x, y: s.y + e.clientY - this.relativePointer.y};
        p.x = Math.max(p.x, 0);
        p.y = Math.max(p.y, 0);
        p.x = Math.min(p.x, svg.getBoundingClientRect().width - this.getWidth());
        p.y = Math.min(p.y, svg.getBoundingClientRect().height- this.getHeight());
        if(restraint)
        {
            var t = dispatchers[restraint[0]];

            p.x = Math.max(t.getX(), p.x);
            p.x = Math.min(t.getX() + t.getWidth(), p.x);
            p.y = Math.max(t.getY(), p.y);
            p.y = Math.min(t.getY() + t.getHeight(), p.y);
            var newRestraint = {x:(((p.x - t.getX()) / t.getWidth())*100)+"%", y:(((p.y - t.getY()) / t.getHeight()) * 100)+"%"};
            if(["left", "right"].indexOf(restraint[1])>-1)
            {
                if(restraint[1]== "left")
                {
                    p.x = t.getX();
                }
                else
                {
                    p.x = t.getX()+t.getWidth();
                }
                newRestraint.x = restraint[1];
            }
            else if (["top", "bottom"].indexOf(restraint[2])>-1)
            {
                if(restraint[2]== "top")
                {
                    p.y = s.y + t.getY();
                }
                else
                {
                    p.y = s.y + t.getY()+t.getHeight();
                }
                newRestraint.y = restraint[2];
            }

            this.options.restraintTo[1] = newRestraint.x;
            this.options.restraintTo[2] = newRestraint.y;
            this._updateOptions();
        }
        this.setPosition(p.x, p.y);
    },
    _parseOptions:function(pString)
    {
        if(!pString)
            return {};

        var options = {};

        var opts = pString.split(";");

        var o, name, params;
        for(var i = 0, max = opts.length; i<max;i++)
        {
            o = opts[i];
            name = o.split(":");
            params = name[1]||"";
            name = name[0];
            options[name] = params.split(",");
        }

        return options;
    },
    _updateOptions:function()
    {
        var strOpt = [], opt;
        for(var i in this.options)
        {
            if(!this.options.hasOwnProperty(i))
                continue;
            opt = i+":"+this.options[i].join(",");
            strOpt.push(opt);
        }
        this.element.setAttribute("data-draggable", strOpt.join(";"));
    },
    _updateConstraint:function()
    {
        var restraint = this.options.restraintTo;
        var rPosition = dispatchers[restraint[0]].getRelativePosition(restraint[1]||"50%", restraint[2]||"50%");
        this.setPosition(rPosition.x, rPosition.y);
    },
    remove:function()
    {
        var id = this.element.getAttribute("id");
        if(!this.element.parentNode)
            return;
        this.element.parentNode.removeChild(this.element);
        dispatchers[id].dispatchEvent(new Event(InteractiveEvent.REMOVED));
        this.removeAllEventListener();
        dispatchers[id] = null;
        delete dispatchers[id];
    },
    setPosition:function(pX, pY)
    {
        this.element.setAttribute("transform", "translate("+pX+","+pY+")");
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    setX:function(pX)
    {
        this.setPosition(pX, this.getY());
    },
    setY:function(pY)
    {
        this.setPosition(this.getX(), pY);
    },
    getX:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.left)||0;
    },
    getY:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.top)||0;
    },
    getWidth:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.width)||0;
    },
    getHeight:function()
    {
        var t = this.element.getBoundingClientRect();
        return Number(t.height)||0;
    },
    getRelativePosition:function(pLeft, pTop)
    {
        var scroll = Context.getScroll();
        var left = 0;
        var top = 0;

        switch(pLeft)
        {
            case "left":
                break;
            case "right":
                left = 1;
                break;
            default:
                left = Number(pLeft.replace("%", "")) / 100;
                break;
        }

        switch(pTop)
        {
            case "top":
                break;
            case "bottom":
                top = 1;
                break;
            default:
                top = Number(pTop.replace("%", "")) / 100;
                break;
        }

        return {
            x: scroll.x + this.getX()+(left * this.getWidth()),
            y: scroll.y + this.getY()+(top * this.getHeight())
        };
    }
});

var InteractiveEvent = {
    BOUNDS_CHANGED: "evt_bounds_changed",
    REMOVED: "evt_removed"
};

function Resizable(pElement)
{

}

Class.define(Resizable, [Draggable], {
    _setupResizable:function(pElement)
    {
        this.__resizeHandler = this._resizeHandler.proxy(this);
        this.__resizedHandler = this._resizedHandler.proxy(this);
        pElement.addEventListener("mousedown", this._downHandler.proxy(this), false);

        this._setupDraggable(pElement);
        SVGElement.create("path", {"d":"M10,0 L10,10 L0,10 Z", "transform":"translate("+(this.getWidth()-15)+", "+(this.getHeight()-15)+")", "fill":"#000", "data-role":"resize"}, this.element);
    },
    _downHandler:function(e)
    {
        if(svg.classList.contains("frozen"))
            return;

        var t = e.target;

        if(t.getAttribute("data-role") && t.getAttribute("data-role") === "resize")
        {
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.relativePointer.x = e.clientX - this.getX();
            this.relativePointer.y = e.clientY - this.getY();
            this.startDimensions = {width:this.getWidth(), height:this.getHeight()};
            document.addEventListener("mouseup", this.__resizedHandler, false);
            document.addEventListener("mousemove", this.__resizeHandler, false);
        }
    },
    _resizeHandler:function(e)
    {
        var newPosition = {
            x: e.clientX - this.getX(),
            y: e.clientY - this.getY()
        };

        var newDimensions = {
            width:this.startDimensions.width + (newPosition.x - this.relativePointer.x),
            height:this.startDimensions.height + (newPosition.y - this.relativePointer.y)
        };

        newDimensions.width = Math.max(newDimensions.width, 100);
        newDimensions.height = Math.max(newDimensions.height, 50);

        this.setDimensions(newDimensions.width, newDimensions.height);
    },
    _resizedHandler:function(e)
    {
        document.removeEventListener("mouseup", this.__resizedHandler, false);
        document.removeEventListener("mousemove", this.__resizeHandler, false);
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    },
    setDimensions:function(pWidth, pHeight)
    {
        var rect = this.element.querySelector("rect");
        rect.setAttribute("width", pWidth);
        rect.setAttribute("height", pHeight);
        var resizer = this.element.querySelector('path[data-role="resize"]');
        resizer.setAttribute("transform", "translate("+(pWidth-15)+", "+(pHeight-15)+")");
        this.dispatchEvent(new Event(InteractiveEvent.BOUNDS_CHANGED));
    }
});

function Block(pElement)
{
    this._setupResizable(pElement);
    this.element.addEventListener("click", this.select.proxy(this), false);
    this.previous = {};
    this.next = {};
}

Class.define(Block,[Resizable], {
    select:function()
    {
        document.querySelectorAll(".draggable."+CLASS_SELECTED).forEach(function(pEl){pEl.classList.remove(CLASS_SELECTED);});
        last_block = this.element.getAttribute("id");
        this.element.classList.add(CLASS_SELECTED);
        propertiesEditor.edit(this);
    },
    setProperty:function(pName, pValue)
    {
        switch(pName)
        {
            case "title":
                this.element.querySelector("text").innerHTML = pValue;
                break;
            case "type":
                this.element.setAttribute("data-type", pValue);
                break;
        }
    },
    getEditableProperties:function()
    {
        var properties = {
            "title":{
                "label":"Titre",
                "type":"text",
                "value":this.element.querySelector("text").innerHTML.trim()
            },
            "type": {
                "label":"Type de block",
                "type":"select",
                "data":type_list,
                "value":this.element.getAttribute("data-type")
            }
        };
        var hasNext = false;
        var next = {};
        var bl;
        for(var i in this.next)
        {
            if(!this.next.hasOwnProperty(i))
                continue;
            bl = dispatchers[i];
            next[i] = {"label":bl.element.querySelector("text").innerHTML, "extra":this.next[i]};
            hasNext = true;
        }
        if(hasNext)
        {
            properties.next = {
                "label":"Liens sortants",
                "type":"list",
                "data":next
            };
        }
        return properties;
    },
    nextBlockRemovedHandler:function(e){
        var id = e.currentTarget.element.getAttribute("id");
        this.next[id] = null;
        delete this.next[id];
    },
    previousBlockRemovedHandler:function(e){
        var id = e.currentTarget.element.getAttribute("id");
        this.previous[id] = null;
        delete this.previous[id];
    },
    addPreviousBlock:function(pId, pLine)
    {
        for(var i in this.previous)
        {
            if(i === pId)
                return;
        }
        this.previous[pId] = pLine;
        dispatchers[pId].addEventListener(InteractiveEvent.REMOVED, this.previousBlockRemovedHandler.proxy(this), false);
    },
    addNextBlock:function(pId, pLine)
    {
        for(var i in this.next)
        {
            if(i === pId)
                return;
        }
        this.next[pId] = pLine;
        dispatchers[pId].addEventListener(InteractiveEvent.REMOVED, this.nextBlockRemovedHandler.proxy(this), false);
    },
    getLinkedBlocks:function()
    {
        var linked = [];
        for(var k in this.next)
        {
            if(!this.next.hasOwnProperty(k))
                continue;
            linked.push(k);
        }
        for(k in this.previous)
        {
            if(!this.previous.hasOwnProperty(k))
                continue;
            linked.push(k);
        }
        return linked;
    }
});

Block.create = function()
{
    var scroll = Context.getScroll();
    var dimensions = {width:200, height:75};
    var previous = dispatchers[last_block];

    var selector = 'g[data-role="block"]:last-of-type';
    var index = (document.querySelector(selector)?Number(document.querySelector(selector).getAttribute("id").split("-")[1])+ 1:1);
    var g = SVGElement.create("g", {
        "transform":"translate("+(scroll.x + previous.getX()+(previous.getWidth()>>1) - (dimensions.width>>1))+","+( scroll.y + previous.getY()+previous.getHeight()+30)+")",
        "id":GROUP_BASE_ID+index,
        "data-role":"block",
        "data-type":"diagnostic"
    });

    var rect = SVGElement.create("rect", {"width":dimensions.width, "height":dimensions.height}, g);
    var text = SVGElement.create("text", {"x":"10", "y":"30", "innerHTML":type_list.diagnostic}, g);

    svg.appendChild(g);

    dispatchers[g.getAttribute("id")] = new Block(g);

    Link.create(last_block, g.getAttribute("id"));

    dispatchers[g.getAttribute("id")].select();
};


function Link(pElement, pFirstBlock ,pSecondBlock)
{
    this.element = pElement;
    var id = this.element.getAttribute("id");
    this.firstBlock = pFirstBlock;
    this.secondBlock = pSecondBlock;
    dispatchers[pFirstBlock].addNextBlock(pSecondBlock, id);
    dispatchers[pSecondBlock].addPreviousBlock(pFirstBlock, id);
    var elements = id.split("_");
    if(elements.length !== 3)
        return;

    this.from = document.getElementById(elements[1]);
    this.to = document.getElementById(elements[2]);

    if(!this.from || ! this.to)
        return;

    this.draggableFrom  = dispatchers[elements[1]];
    this.draggableTo = dispatchers[elements[2]];

    this.draggableFrom.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._updatePositionHandler.proxy(this), false);
    this.draggableFrom.addEventListener(InteractiveEvent.REMOVED, this.draggableFromRemoved.proxy(this), false);
    this.draggableTo.addEventListener(InteractiveEvent.BOUNDS_CHANGED, this._updatePositionHandler.proxy(this), false);
    this.draggableTo.addEventListener(InteractiveEvent.REMOVED, this.draggableToRemoved.proxy(this), false);
    this._updatePositionHandler();
}

Class.define(Link, [], {
    _updatePositionHandler:function(e)
    {
        var scroll = Context.getScroll();
        this.element.setAttribute("x1", scroll.x + this.draggableFrom.getX()+(this.draggableFrom.getWidth()>>1));
        this.element.setAttribute("y1", scroll.y + this.draggableFrom.getY()+(this.draggableFrom.getHeight()>>1));
        this.element.setAttribute("x2", scroll.x + this.draggableTo.getX()+(this.draggableTo.getWidth()>>1));
        this.element.setAttribute("y2", scroll.y + this.draggableTo.getY()+(this.draggableFrom.getHeight()>>1));
    },
    remove:function(e)
    {
        var id = this.element.getAttribute("id");
        if(!this.element.parentNode)
            return;
        this.element.parentNode.removeChild(this.element);
        if(this.draggableFrom)
            this.draggableFrom.remove();
        if(this.draggableTo)
            this.draggableTo.remove();
        links[id] = null;
        delete links[id];
    },
    draggableFromRemoved:function(e)
    {
        this.draggableFrom = null;
        this.remove(e);
    },
    draggableToRemoved:function(e)
    {
        this.draggableTo = null;
        this.remove(e);
    }
});

Link.create = function(pFirstBlock, pSecondBlock)
{

    var index = (document.querySelector("circle:last-of-type")?Number(document.querySelector("circle:last-of-type").getAttribute("id").split("-")[1]) + 1:1);

    var id = LINK_BASE_ID+ANCHOR_BASE_ID+index+"_"+ANCHOR_BASE_ID+(index+1);
    var line = SVGElement.create("line",{
        "id":id,
        "class":"link",
        "marker-end":"url(#arrow)"
    }, svg);

    var circle = SVGElement.create("circle", {
        "r":"10",
        "id":ANCHOR_BASE_ID+index,
        "data-draggable":"restraintTo:"+pFirstBlock+",50%,bottom",
        "data-role":"block"
    }, svg);
    dispatchers[circle.getAttribute("id")] = new Draggable(circle);
    circle = SVGElement.create("circle", {
        "r":"10",
        "id":ANCHOR_BASE_ID+(index+1),
        "data-draggable":"restraintTo:"+ pSecondBlock+",50%,top"
    }, svg);
    dispatchers[circle.getAttribute("id")] = new Draggable(circle);
    links[id] = new Link(line, pFirstBlock, pSecondBlock);
};

var SVGElement = {
    create:function(pName, pAttributes, pParentNode)
    {
        return Element.create(pName, pAttributes, pParentNode, NS_SVG);
    }
};

var Element = {
    create:function(pName, pAttributes, pParentNode, pNs)
    {
        var element = pNs?document.createElementNS(pNs, pName):document.createElement(pName);

        for(var i in pAttributes)
        {
            if(!pAttributes.hasOwnProperty(i))
                continue;
            switch(i)
            {
                case "innerHTML":
                    element.innerHTML = pAttributes[i];
                    break;
                default:
                    element.setAttribute(i, pAttributes[i]);
                    break;
            }
        }

        if(pParentNode)
            pParentNode.appendChild(element);

        return element;
    }
};

function PropertiesEditor(pElement)
{
    this.element = pElement;
}

Class.define(PropertiesEditor, [], {
    edit:function(pElement)
    {
        var editable_props = pElement.getEditableProperties();

        var container = this.element.querySelector(".properties");

        container.innerHTML = "";

        var prop, label, inp_ct, input, id_inp, changed_cb, o, k;
        for(var i in editable_props)
        {
            if(!editable_props.hasOwnProperty(i))
                continue;

            prop = editable_props[i];

            inp_ct = Element.create("div", {"class":"inp_container"}, container);
            id_inp = "input_"+i;

            label = Element.create("label", {"for":id_inp, "innerHTML":prop.label+" : "}, inp_ct);

            changed_cb = function(e){
                pElement.setProperty(e.currentTarget.getAttribute("data-prop"), e.currentTarget.value);
            };

            switch(prop.type)
            {
                case "text":
                    input = Element.create("input", {"id":id_inp, "name":id_inp, "type":"text", "value":prop.value, "data-prop":i}, inp_ct);
                    input.addEventListener("keydown", changed_cb, false);
                    input.addEventListener("keyup", changed_cb, false);
                    break;
                case "select":
                    input = Element.create("select", {"id":id_inp, "name":id_inp, "data-prop":i}, inp_ct);
                    input.addEventListener("change", changed_cb, false);
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;
                        o = {"value":k, "innerHTML":prop.data[k], "class":k};
                        if(k == prop.value)
                            o.selected = "selected";
                        Element.create("option", o, input);
                    }
                    break;
                case "list":
                    var ul = Element.create("ul", {"class":"list"}, inp_ct);
                    var li, action;
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;

                        li = Element.create("li", {}, ul);
                        Element.create("span", {"innerHTML":prop.data[k].label}, li);
                        action = Element.create("span", {"innerHTML":"&times;", "data-target":pElement.element.getAttribute("id"), "data-remove":prop.data[k].extra, "class":"remove"}, li);
                        action.addEventListener("click", function(e){
                            var t = e.currentTarget;
                            var remove = t.getAttribute("data-remove");
                            links[remove].remove();
                            propertiesEditor.edit(pElement);
                        }, false);
                    }
                    break;
            }
        }

        var ignore = [pElement.element.getAttribute("id")].concat(pElement.getLinkedBlocks());
        var has_options = false;
        var further_blocks = {};
        for(i in dispatchers)
        {
            if(!dispatchers.hasOwnProperty(i)||!dispatchers[i].element.querySelector("text")||ignore.indexOf(i)>-1)
                continue;

            further_blocks[dispatchers[i].element.getAttribute("id")] = dispatchers[i].element.querySelector("text").innerHTML;
            has_options = true;
        }

        if(has_options)
        {
            inp_ct = Element.create("div", {"class":"add_link_handler"}, container);
            Element.create("label", {"innerHTML":"Ajouter un lien vers : "}, inp_ct);
            o = {};
            if(!has_options)
                o['disabled'] = 'disabled';
            input = Element.create("select",o, inp_ct);
            for(i in further_blocks)
            {
                if(!further_blocks.hasOwnProperty(i))
                    continue;
                Element.create("option", {"value":i, "innerHTML":further_blocks[i]}, input);
            }
            o['innerHTML'] = "Ajouter";
            var button = Element.create("button", o, inp_ct);

            button.addEventListener("click", function(e){
                var t = e.currentTarget;
                var selectedValue = t.parentNode.querySelector("select").value;
                Link.create(pElement.element.getAttribute("id"), selectedValue);
                propertiesEditor.edit(pElement);
            }, false);
        }

        inp_ct = Element.create("div", {"class":"actions"}, container);
        input = Element.create("button", {}, inp_ct);
        Element.create("span", {"class":"material-icons", "innerHTML":"&#xE145;"}, input);
        Element.create("span", {"innerHTML":"Ajouter un block"}, input);
        input.addEventListener("click", Block.create, false);
        input = Element.create("button", {"class":"delete"}, inp_ct);
        Element.create("span", {"class":"material-icons", "innerHTML":"&#xE872;"}, input);
        Element.create("span", {"innerHTML":"Supprimer le block"}, input);
        input.addEventListener("click", function(e){
            pElement.remove();
            propertiesEditor.deselect();
        }, false);

    },
    deselect:function()
    {
        var container = this.element.querySelector(".properties");
        container.innerHTML = "";
    }
});

function toggleFrozenStatus()
{
    svg.classList.toggle("frozen");
    document.querySelector("#toggle_ui .label").innerHTML = (svg.classList.contains("frozen")?"D&eacute;bloquer":"Bloquer")+" l'interface";
    document.querySelector("#toggle_ui .material-icons").innerHTML = (svg.classList.contains("frozen")?"&#xE899;":"&#xE898;");
}

(function(){

    function init()
    {
        svg = document.querySelector("svg");
        svg.querySelectorAll('*[data-role="block"]').forEach(function(pElement){
            dispatchers[pElement.getAttribute("id")] = new Block(pElement);
            last_block = pElement.getAttribute("id");
        });
        svg.querySelectorAll('*[data-role="anchor"]').forEach(function(pElement){
            dispatchers[pElement.getAttribute("id")] = new Draggable(pElement);
        });

        svg.querySelectorAll('line.link').forEach(function(pElement){
            new Link(pElement);
        });

        propertiesEditor = new PropertiesEditor(document.querySelector(".properties_editor"));
    }

    NodeList.prototype.forEach = Array.prototype.forEach;
    window.addEventListener("DOMContentLoaded", init, false);
})();