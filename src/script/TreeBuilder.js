var NS_SVG = "http://www.w3.org/2000/svg";
var GROUP_BASE_ID = "group_";
var LINK_BASE_ID = "link_";
var ANCHOR_BASE_ID = "anchor";
var CLASS_SELECTED = "selected";

var pEditor;
var watchers = {};
var links = {};
var last_block = "";
var svg;

function Draggable(pElement)
{
    this._setup(pElement);
}

Class.define(Draggable, [EventDispatcher], {
    _setup:function(pElement)
    {
        this.removeAllEventListener();
        this.hasBeenDragged = false;
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
            watchers[this.options.restraintTo[0]].addEventListener(DraggableEvent.POSITION_UPDATED, this._updateConstraint.proxy(this), false);
            this._updateConstraint();
        }
    },
    _startDragHandler:function(e)
    {
        this.hasBeenDragged = false;
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
        this.dispatchEvent(new Event(DraggableEvent.POSITION_UPDATED));
    },
    _dragHandler:function(e)
    {
        this.hasBeenDragged = true;
        var restraint = this.options.restraintTo;
        var p = {x: e.clientX - this.relativePointer.x, y: e.clientY - this.relativePointer.y};
        if(restraint)
        {
            var t = watchers[restraint[0]];

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
                    p.y = t.getY();
                }
                else
                {
                    p.y = t.getY()+t.getHeight();
                }
                newRestraint.y = restraint[2];
            }

            this.options.restraintTo[1] = newRestraint.x;
            this.options.restraintTo[2] = newRestraint.y;
            this._updateOptions();
        }
        this.element.setAttribute("transform", "translate("+ p.x+","+ p.y+")");
        this.dispatchEvent(new Event(DraggableEvent.POSITION_UPDATED));
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
        var rPosition = watchers[restraint[0]].getRelativePosition(restraint[1]||"50%", restraint[2]||"50%");
        this.element.setAttribute("transform", "translate("+ rPosition.x+","+ rPosition.y+")");
        this.dispatchEvent(new Event(DraggableEvent.POSITION_UPDATED));
    },
    remove:function()
    {
        this.removeAllEventListener();
        this.element.parentNode.removeChild(this.element);
        watchers[this.element.getAttribute("id")] = null;
        delete watchers[this.element.getAttribute("id")];
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
    getScroll:function()
    {
        var p = this.element;
        var scroll = {x:0, y:0};
        while(p)
        {
            scroll.x += Number(p.scrollLeft||0);
            scroll.y += Number(p.scrollTop||0);
            p = p.parentNode;
        }
        return scroll;
    },
    getRelativePosition:function(pLeft, pTop)
    {
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
            x:this.getX()+(left * this.getWidth()),
            y:this.getY()+(top * this.getHeight())
        };
    }
});

var DraggableEvent = {
    POSITION_UPDATED: "evt_position_updated"
};

function Block(pElement)
{
    this._setup(pElement);
    this.element.addEventListener("click", this.select.proxy(this), false);
    this.previous = {};
    this.next = {};
}

Class.define(Block,[Draggable], {
    select:function()
    {
        if(this.hasBeenDragged)
            return;
        document.querySelectorAll(".draggable."+CLASS_SELECTED).forEach(function(pEl){pEl.classList.remove(CLASS_SELECTED);});
        last_block = this.element.getAttribute("id");
        this.element.classList.add(CLASS_SELECTED);
        pEditor.edit(this);
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
                "data":{
                    "diagnostic":"D&eacute;marche diagnostique",
                    "reflexion": "R&eacute;flexion",
                    "treatment": "Traitement"
                },
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
            bl = watchers[i];
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
    removeNextBlock:function(pId){
        this.next[pId] = null;
        delete this.next[pId];
        console.log(this.next);
    },
    removePreviousBlock:function(pId){
        this.previous[pId] = null;
        delete this.previous[pId];
        console.log(this.previous);
    },
    addPreviousBlock:function(pId, pLine)
    {
        console.log(this.element.getAttribute("id")+" "+pId);
        for(var i in this.previous)
        {
            if(i === pId)
                return;
        }
        this.previous[pId] = pLine;
    },
    addNextBlock:function(pId, pLine)
    {
        for(var i in this.next)
        {
            if(i === pId)
                return;
        }
        this.next[pId] = pLine;
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
    var previous = watchers[last_block];

    var index = document.querySelectorAll("g").length + 1;
    var g = SVGElement.create("g", {
        "transform":"translate("+previous.getX()+","+(previous.getY()+previous.getHeight()+30)+")",
        "id":GROUP_BASE_ID+index,
        "data-role":"block",
        "data-type":"diagnostic"
    });

    var rect = SVGElement.create("rect", {"width":"200", "height":"75"}, g);
    var text = SVGElement.create("text", {"x":"10", "y":"30"}, g);
    text.innerHTML = "Lorem Ipsum";

    svg.appendChild(g);

    watchers[g.getAttribute("id")] = new Block(g);

    Link.create(last_block, g.getAttribute("id"));

    watchers[g.getAttribute("id")].select();
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

function Link(pElement, pFirstBlock ,pSecondBlock)
{
    this.element = pElement;
    var id = this.element.getAttribute("id");
    this.firstBlock = pFirstBlock;
    this.secondBlock = pSecondBlock;
    watchers[pFirstBlock].addNextBlock(pSecondBlock, id);
    watchers[pSecondBlock].addPreviousBlock(pFirstBlock, id);
    var elements = id.split("_");
    if(elements.length !== 3)
        return;

    this.from = document.getElementById(elements[1]);
    this.to = document.getElementById(elements[2]);

    if(!this.from || ! this.to)
        return;

    this.draggableFrom  = watchers[elements[1]];
    this.draggableTo = watchers[elements[2]];

    this.draggableFrom.addEventListener(DraggableEvent.POSITION_UPDATED, this._updatePositionHandler.proxy(this), false);
    this.draggableTo.addEventListener(DraggableEvent.POSITION_UPDATED, this._updatePositionHandler.proxy(this), false);
    this._updatePositionHandler();
}

Class.define(Link, [], {
    _updatePositionHandler:function(e)
    {
        this.element.setAttribute("x1", this.draggableFrom.getX()+(this.draggableFrom.getWidth()>>1));
        this.element.setAttribute("y1",this.draggableFrom.getY()+(this.draggableFrom.getHeight()>>1));
        this.element.setAttribute("x2", this.draggableTo.getX()+(this.draggableTo.getWidth()>>1));
        this.element.setAttribute("y2", this.draggableTo.getY()+(this.draggableFrom.getHeight()>>1));
    },
    remove:function()
    {
        var id = this.element.getAttribute("id");
        watchers[this.firstBlock].removeNextBlock(this.secondBlock);
        watchers[this.secondBlock].removePreviousBlock(this.firstBlock);
        this.draggableFrom.remove();
        this.draggableTo.remove();
        this.element.parentNode.removeChild(this.element);
        links[id] = null;
        delete links[id];
    }
});

Link.create = function(pFirstBlock, pSecondBlock)
{
    var index = document.querySelectorAll("circle").length + 1;

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
    watchers[circle.getAttribute("id")] = new Draggable(circle);
    circle = SVGElement.create("circle", {
        "r":"10",
        "id":ANCHOR_BASE_ID+(index+1),
        "data-draggable":"restraintTo:"+ pSecondBlock+",50%,top"
    }, svg);
    watchers[circle.getAttribute("id")] = new Draggable(circle);
    links[id] = new Link(line, pFirstBlock, pSecondBlock);
};

function PropertiesEditor(pElement)
{
    this.element = pElement;
}

Class.define(PropertiesEditor, [], {
    edit:function(pElement)
    {
        document.getElementById("add_block").removeAttribute("disabled");
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
                    var ul = Element.create("ul", {}, inp_ct);
                    var li, action;
                    for(k in prop.data)
                    {
                        if(!prop.data.hasOwnProperty(k))
                            continue;

                        li = Element.create("li", {}, ul);
                        Element.create("span", {"innerHTML":prop.data[k].label}, li);
                        action = Element.create("span", {"innerHTML":"&times;", "data-target":pElement.element.getAttribute("id"), "data-remove":prop.data[k].extra}, li);
                        action.addEventListener("click", function(e){
                            var t = e.currentTarget
                            var remove = t.getAttribute("data-remove");
                            links[remove].remove();
                            pEditor.edit(pElement);
                        }, false);
                    }
                    break;
            }
        }

        var ignore = [pElement.element.getAttribute("id")].concat(pElement.getLinkedBlocks());
        var has_options = false;
        var further_blocks = {};
        for(i in watchers)
        {
            if(!watchers.hasOwnProperty(i)||!watchers[i].element.querySelector("text")||ignore.indexOf(i)>-1)
                continue;

            further_blocks[watchers[i].element.getAttribute("id")] = watchers[i].element.querySelector("text").innerHTML;
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
                pEditor.edit(pElement);
            }, false);
        }
    }
});

function toggleAnchorVisibility()
{
    svg.classList.toggle("hideAnchors");
    document.getElementById("toggle_anchors").innerHTML = (svg.classList.contains("hideAnchors")?"Afficher":"Cacher")+" les ancres";
}

(function(){

    function init()
    {
        svg = document.querySelector("svg");
        svg.querySelectorAll('*[data-role="block"]').forEach(function(pElement){
            watchers[pElement.getAttribute("id")] = new Block(pElement);
            last_block = pElement.getAttribute("id");
        });
        svg.querySelectorAll('*[data-role="anchor"]').forEach(function(pElement){
            watchers[pElement.getAttribute("id")] = new Draggable(pElement);
        });

        svg.querySelectorAll('line.link').forEach(function(pElement){
            new Link(pElement);
        });

        pEditor = new PropertiesEditor(document.querySelector(".properties_editor"));
    }

    NodeList.prototype.forEach = Array.prototype.forEach;
    window.addEventListener("DOMContentLoaded", init, false);
})();