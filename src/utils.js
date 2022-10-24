(function (cwApi, $) {
  "use strict";
  // config
  var removeDiagramPopOut = true,
    historyBrowser = true;

  /********************************************************************************
    Custom Action for Single and Index Page : See Impact here http://bit.ly/2qy5bvB
    *********************************************************************************/
  cwCustomerSiteActions.doActionsForSingle_Custom = function (rootNode) {
    var currentView, url, i, cwView;
    currentView = cwAPI.getCurrentView();

    if (currentView) cwView = currentView.cwView;
    for (i in cwAPI.customLibs.doActionForSingle) {
      if (cwAPI.customLibs.doActionForSingle.hasOwnProperty(i)) {
        if (typeof cwAPI.customLibs.doActionForSingle[i] === "function") {
          cwAPI.customLibs.doActionForSingle[i](rootNode, cwView);
        }
      }
    }
  };

  cwCustomerSiteActions.doActionsForIndex_Custom = function (rootNode) {
    var currentView, url, i, cwView;
    currentView = cwAPI.getCurrentView();

    if (currentView) cwView = currentView.cwView;
    for (i in cwAPI.customLibs.doActionForIndex) {
      if (cwAPI.customLibs.doActionForIndex.hasOwnProperty(i)) {
        if (typeof cwAPI.customLibs.doActionForIndex[i] === "function") {
          cwAPI.customLibs.doActionForIndex[i](rootNode, cwView);
        }
      }
    }
  };

  cwCustomerSiteActions.doActionsForAll_Custom = function (rootNode) {
    var currentView, url, i, cwView;
    currentView = cwAPI.getCurrentView();
    if (currentView) cwView = currentView.cwView;

    for (i in cwAPI.customLibs.doActionForAll) {
      if (cwAPI.customLibs.doActionForAll.hasOwnProperty(i)) {
        if (typeof cwAPI.customLibs.doActionForAll[i] === "function") {
          cwAPI.customLibs.doActionForAll[i](rootNode, cwView);
        }
      }
    }
  };

  var enablePrintButton = async function (rootNode, cwView) {
    let config = cwAPI.customLibs.utils.getCustomLayoutConfiguration("misc");
    if (config) {
      if (config.hidePrintButton || config.betaPrintButton) {
        while (!document.querySelector("#cw_print_btn")) {
          await timeout(500);
        }
        if (config.hidePrintButton) {
          $("#cw_print_btn").hide();
        }
        if (config.betaPrintButton) {
          var currentView = cwAPI.getCurrentView();

          $("#cw_print_btn").removeAttr("href");
          $("#cw_print_btn").unbind("click");
          if (cwAPI.isDebugMode() === false) {
            function loadjscssfile(filename) {
              var fileref = document.createElement("script");
              fileref.setAttribute("type", "text/javascript");
              fileref.setAttribute("src", filename);
              if (typeof fileref != "undefined") document.getElementsByTagName("head")[0].appendChild(fileref);
            }
            loadjscssfile("/evolve/Common/modules/jspdf/jspdf.min.js?" + cwApi.getDeployNumber());
          }

          $("#cw_print_btn").click(async () => {
            var name = currentView.name;
            if (cwAPI.isSinglePageType()) {
              let a = document.querySelector("#cw-top-bar .cw-bc:last-child span");
              let OT = cwAPI.getObjectTypeName(cwAPI.getRootObjectTypeForCurrentView());
              name = OT == name ? name : `${cwAPI.getObjectTypeName(cwAPI.getRootObjectTypeForCurrentView())} - ${name}`;
              name = `${name} - ${a.innerHTML} - `;
            }

            let cwPdf = new cwApi.customLibs.utils.cwPdf(name);
            cwPdf.getPdf();
          });
        }
      }
    }
  };

  var parseNode = function (child, callback) {
    for (var associationNode in child) {
      if (child.hasOwnProperty(associationNode) && child[associationNode] !== null) {
        for (var i = 0; i < child[associationNode].length; i += 1) {
          var nextChild = child[associationNode][i];
          callback(nextChild, associationNode, false);
        }
        if (child[associationNode].length === 0) callback({}, associationNode, true);
      }
    }
  };

  var parseNodeForComplementary = function (child, callback) {
    for (var associationNode in child) {
      if (child.hasOwnProperty(associationNode) && child[associationNode] !== null) {
        for (var i = 0; i < child[associationNode].length; i += 1) {
          var nextChild = child[associationNode][i];
          callback(nextChild, associationNode, false);
        }
        if (child[associationNode].length === 0) callback({}, associationNode, true);
      }
    }
  };

  var manageHiddenNodes = function (parent, config, bNodeIDOfParent) {
    var childrenToRemove = [],
      childrenToAdd = [],
      idTable = {};

    parseNode(parent, function (child, associationNode, empty) {
      if (empty) {
      } else {
        manageHiddenNodes(child.associations, config, bNodeIDOfParent);
        if (config.indexOf(associationNode) !== -1) {
          // jumpAndMerge when hidden
          childrenToRemove.push(associationNode);
          for (let nextassociationNode in child.associations) {
            if (child.associations.hasOwnProperty(nextassociationNode)) {
              for (let i = 0; i < child.associations[nextassociationNode].length; i += 1) {
                let nextChild = child.associations[nextassociationNode][i];
                if (idTable[associationNode] === undefined) idTable[associationNode] = [];
                if (idTable[associationNode].indexOf(nextChild.objectTypeScriptName + "_" + nextChild.object_id) === -1) {
                  idTable[associationNode].push(nextChild.objectTypeScriptName + "_" + nextChild.object_id);
                  if (bNodeIDOfParent) {
                    let o = {};
                    o.node = associationNode;
                    o.obj = nextChild;
                    childrenToAdd.push(o);
                  } else {
                    if (!parent.hasOwnProperty(nextassociationNode)) parent[nextassociationNode] = [];
                    parent[nextassociationNode].push(nextChild);
                  }
                }
              }
            }
          }
        }
      }
    });

    childrenToRemove.forEach(function (c) {
      delete parent[c];
    });

    childrenToAdd.forEach(function (c) {
      if (parent[c.node] === undefined) parent[c.node] = [];
      parent[c.node].push(c.obj);
    });

    for (let id in parent) {
      if (parent.hasOwnProperty(id)) {
        parent[id].sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
      }
    }
  };

  var cleanEmptyNodes = function (parent, config) {
    var hasData = true;
    if (config.indexOf(parent.nodeID) !== -1) hasData = false;
    for (let associationNode in parent.associations) {
      if (
        parent.associations.hasOwnProperty(associationNode) &&
        parent.associations[associationNode] !== null &&
        parent.associations[associationNode] !== undefined
      ) {
        let objectToRemove = [];

        for (let i = 0; i < parent.associations[associationNode].length; i += 1) {
          let child = parent.associations[associationNode][i];
          if (cleanEmptyNodes(child, config) === false) {
            objectToRemove.push(i);
          }
        }

        for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
          delete parent.associations[associationNode].splice(objectToRemove[i], 1);
        }

        if (config.indexOf(parent.nodeID) !== -1 && !hasData) hasData = parent.associations[associationNode].length > 0;
      }
    }

    return hasData;
  };

  var manageContextualNodes = function (parent, config, mainID) {
    var childrenToRemove = [];

    // we check if there is at least one contextual node, then put context to false
    var context = !Object.keys(parent).some(function (assNode) {
      return config.indexOf(assNode) !== -1;
    });

    for (let associationNode in parent) {
      if (parent.hasOwnProperty(associationNode) && parent[associationNode] !== null && parent[associationNode] !== undefined) {
        let objectToRemove = [];
        let contextualNode = config.indexOf(associationNode) !== -1;
        // we self delete if we are a contextual node
        if (contextualNode) {
          childrenToRemove.push(associationNode);
        }

        for (let i = 0; i < parent[associationNode].length; i += 1) {
          let child = parent[associationNode][i];
          if (contextualNode && mainID === child.object_id) context = true; // the main object is present inside the node; so we keep the parent node
          if (
            contextualNode === false &&
            manageContextualNodes(child.associations, config, associationNode == mainID ? child.object_id : mainID) === false
          ) {
            objectToRemove.push(i);
          }
        }
        for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
          delete parent[associationNode].splice(objectToRemove[i], 1);
        }
      }
    }

    // we remove the association used for contextual information
    childrenToRemove.forEach(function (c) {
      delete parent[c];
    });

    return context;
  };

  var manageFilterByBaseObjectNodes = function (parent, config, mainID) {
    for (let associationNode in parent) {
      if (parent.hasOwnProperty(associationNode) && parent[associationNode] !== null && parent[associationNode] !== undefined) {
        let objectToRemove = [];
        let contextualNode = config.indexOf(associationNode) !== -1;

        for (let i = 0; i < parent[associationNode].length; i += 1) {
          let child = parent[associationNode][i];
          manageFilterByBaseObjectNodes(child.associations, config, mainID);
          if (contextualNode === true && child.object_id !== mainID) {
            objectToRemove.push(i);
          }
        }
        for (let i = objectToRemove.length - 1; i >= 0; i -= 1) {
          delete parent[associationNode].splice(objectToRemove[i], 1);
        }
      }
    }
  };

  var getItemDisplayString = function (view, item) {
    if (!cwAPI.customLibs.utils.layoutsByNodeId.hasOwnProperty(view + "_" + item.nodeID)) {
      if (cwAPI.getViewsSchemas()[view].NodesByID.hasOwnProperty(item.nodeID) && cwAPI.getViewsSchemas()[view].NodesByID[item.nodeID].LayoutOptions) {
        var cds = cwAPI.getViewsSchemas()[view].NodesByID[item.nodeID].LayoutOptions.DisplayPropertyScriptName;
        return cwAPI.customLibs.utils.getCustomDisplayString(cds, item);
      }
    }
    return item.name;
  };

  var getCustomDisplayStringWithOutHTML = function (cds, item) {
    var p = new cwApi.CwDisplayProperties(cds, false);
    let config = cwAPI.customLibs.utils.getCustomLayoutConfiguration("cdsEnhanced");
    var defaultIcon = "fa fa-external-link";
    if (config) {
      if (config.defaultIcon) defaultIcon = config.defaultIcon;
    }
    let _item = JSON.parse(JSON.stringify(item));

    Object.keys(_item.properties).forEach(function (p) {
      let prop = cwApi.mm.getProperty(item.objectTypeScriptName, p);
      if (prop && prop.type == "Lookup") {
        prop.lookups.forEach(function (l) {
          if (l.id.toString() === _item.properties[p]) {
            _item.properties[p + "_id"] = l.id;
            _item.properties[p + "_abbr"] = l.abbr;
            _item.properties[p] = l.name;
          }
        });
      }
    });
    Object.keys(_item.associations).forEach(function (a) {
      if (_item.associations[a].items) _item.associations[a] = _item.associations[a].items;
    });

    let itemLabel = p.getDisplayString(_item);
    itemLabel = cwApi.cwLayouts.CwLayout.prototype.getEnhancedDisplayItemWithoutHTML(config, itemLabel, _item);
    return itemLabel.replace(/<[^>]*>?/gm, "");
  };

  var getCustomDisplayString = function (cds, item, nodeID, hasTooltip, fullURL) {
    if (cds.indexOf("ngDirectives") !== -1) return null;
    var itemDisplayName, titleOnMouseOver, link, itemLabel, markedForDeletion, linkTag, linkEndTag;
    var defaultIcon = "fa fa-external-link";
    let config = cwAPI.customLibs.utils.getCustomLayoutConfiguration("cdsEnhanced");
    if (config) {
      if (config.defaultIcon) defaultIcon = config.defaultIcon;
    }
    // use the display property scriptname
    var p = new cwApi.CwDisplayProperties(cds, false);
    itemLabel = p.getDisplayString(item);
    link = cwApi.getSingleViewHash(item.objectTypeScriptName, item.object_id);
    if (fullURL) link = window.location.origin + window.location.pathname + link;
    titleOnMouseOver =
      hasTooltip && !cwApi.isUndefined(item.properties.description)
        ? cwApi.cwEditProperties.cwEditPropertyMemo.isHTMLContent(item.properties.description)
          ? $(item.properties.description).text()
          : item.properties.description
        : "";
    let isInDisplay = document.querySelector(".homePage_evolveView") ? true : false;
    markedForDeletion = cwApi.isObjectMarkedForDeletion(item) ? " markedForDeletion" : "";
    if (isInDisplay) {
      let cleanLabel = itemLabel.includes("<") ? item.name : itemLabel;
      linkTag =
        '<a class="contextClick ' +
        nodeID +
        markedForDeletion +
        '" onclick="cwAPI.customLibs.utils.clickSingleContext(event' +
        ",'" +
        item.objectTypeScriptName +
        "'," +
        item.object_id +
        ",'" +
        cleanLabel
          .replace(/<@.*?@>/, "")
          .replace(/<#.*?#>/, "")
          .replaceAll("(", "\\(")
          .replaceAll(")", "\\)")
          .replaceAll('"', '\\"')
          .replaceAll("'", "\\'") +
        "'" +
        ')" >';
      linkEndTag = "</a>";
      itemDisplayName = linkTag + itemLabel + linkEndTag;
    } else {
      linkTag = "<a class='" + nodeID + markedForDeletion + "' href='" + link + "'>";
      linkEndTag = "</a>";
      if (itemLabel.indexOf("<@") !== -1 && itemLabel.indexOf("\\<@") === -1) {
        let info = itemLabel.split("<@")[1].split("@>")[0];
        if (info.split("@")[0] === "contrib" && cwApi.cwUser.isCurrentUserSocial()) {
          itemDisplayName = itemLabel.replace(/<@.*@>/g, "");
        } else {
          itemDisplayName = itemLabel.replace(/<@(contrib@)*/g, linkTag).replace(/@>/g, linkEndTag);
        }
      } else {
        itemDisplayName = linkTag + itemLabel + linkEndTag;
      }
    }
    if (cwApi.cwLayouts.CwLayout.prototype.getEnhancedDisplayItem) {
      itemDisplayName = cwApi.cwLayouts.CwLayout.prototype.getEnhancedDisplayItem(config, itemDisplayName, item);
    }
    itemDisplayName = '<a class="obj" >' + itemDisplayName + "</a>";

    $("span").attr("data-children-number");

    return itemDisplayName;
  };

  var copyToClipboard = function (str) {
    const el = document.createElement("textarea");
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  var copyCanvasToClipboard = function (canvas) {
    if (canvas.msToBlob) {
      //for IE
      var blob = canvas.msToBlob();
      canvas.focus();
      cwApi.customLibs.utils.copyToImageClipboard(blob);
    } else {
      canvas.toBlob(function (blob) {
        canvas.focus();
        cwApi.customLibs.utils.copyToImageClipboard(blob);
      }, "image/png");
    }
  };

  var getBlobFromCanva = function (canvas, callback) {
    if (canvas.msToBlob) {
      //for IE
      var blob = canvas.msToBlob();
      canvas.focus();
      callback(blob);
    } else {
      canvas.toBlob(function (blob) {
        callback(blob);
      }, "image/png");
    }
  };

  var copyToImageClipboard = function copyToImageClipboard(blob) {
    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    navigator.clipboard.write([new ClipboardItem(_defineProperty({}, blob.type, blob))]);
  };

  var trimCanvas = function (c) {
    var ctx = c.getContext("2d"),
      copy = document.createElement("canvas").getContext("2d"),
      pixels = ctx.getImageData(0, 0, c.width, c.height),
      l = pixels.data.length,
      i,
      bound = {
        top: null,
        left: null,
        right: null,
        bottom: null,
      },
      x,
      y;

    // Iterate over every pixel to find the highest
    // and where it ends on every axis ()
    for (i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) {
        x = (i / 4) % c.width;
        y = ~~(i / 4 / c.width);

        if (bound.top === null) {
          bound.top = y;
        }

        if (bound.left === null) {
          bound.left = x;
        } else if (x < bound.left) {
          bound.left = x;
        }

        if (bound.right === null) {
          bound.right = x;
        } else if (bound.right < x) {
          bound.right = x;
        }

        if (bound.bottom === null) {
          bound.bottom = y;
        } else if (bound.bottom < y) {
          bound.bottom = y;
        }
      }
    }
    bound.bottom = bound.bottom * 1.1;
    bound.top = bound.top * 0.9;
    bound.right = bound.right * 1.1;
    bound.left = bound.left * 0.9;

    // Calculate the height and width of the content
    var trimHeight = bound.bottom - bound.top,
      trimWidth = bound.right - bound.left,
      trimmed = ctx.getImageData(bound.left * 0.9, bound.top * 0.9, trimWidth * 1.2, trimHeight * 1.2);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);
    // Return trimmed canvas
    return copy.canvas;
  };

  var getPaletteShape = function (obj, diagramTemplate, errors) {
    let palette;
    if (
      obj &&
      obj.properties.type_id &&
      diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|" + obj.properties.type_id]
    ) {
      palette = diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|" + obj.properties.type_id];
    } else if (obj && diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|0"]) {
      palette = diagramTemplate.diagram.paletteEntries[obj.objectTypeScriptName.toUpperCase() + "|0"];
    } else {
      if (obj && obj.properties.type === undefined) {
        if (undefined === errors.properties) {
          errors.properties = {};
        }
        errors.properties.type = cwAPI.mm.getProperty(obj.objectTypeScriptName, "type").name;
      }
    }
    return palette;
  };

  var shapeToImage = function (obj, diagramTemplate, errors, size) {
    console.log("Drawing " + obj.name + " with " + diagramTemplate.name);
    if (errors === undefined) errors = {};
    var self = this;
    let palette;

    if (obj && diagramTemplate) {
      palette = getPaletteShape(obj, diagramTemplate, errors);
      if (palette) {
        var shape = {};

        palette.Regions.forEach(function (region) {
          if (region.RegionType >= 3 && region.RegionType < 8 && !obj.properties.hasOwnProperty(region.SourcePropertyTypeScriptName)) {
            if (undefined === errors.properties) {
              errors.properties = {};
            }
            errors.properties[region.SourcePropertyTypeScriptName] = cwAPI.mm.getProperty(
              obj.objectTypeScriptName,
              region.SourcePropertyTypeScriptName
            ).name;
          }
          if (region.RegionType < 3 && region.RegionData && !obj.associations.hasOwnProperty(region.RegionData.Key)) {
            if (undefined === errors.associations) {
              errors.associations = {};
            }
            errors.associations[region.RegionData.Key] =
              region.RegionData.AssociationTypeScriptName + " => " + cwAPI.mm.getObjectType(region.RegionData.TargetObjectTypeScriptName).name;
          }
        });

        shape.H = palette.Height * 4; // çorrespondance pixel taille modeler
        shape.W = palette.Width * 4;
        size.Width = palette.Width;
        size.Height = palette.Height;
        //node.size = (2 * 35 * palette.Height) / 32;
        var qualityFactor = 3;

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        canvas.id = "gImage";

        // avoid to big canva
        if (qualityFactor * Math.max(shape.W, shape.H) * 3 > 1000) qualityFactor = 1000 / Math.max(shape.W, shape.H) / 3;
        // taking margin for region outside of the shape, 100% each side
        canvas.width = qualityFactor * shape.W * 3;
        canvas.height = qualityFactor * shape.H * 3;

        shape.X = canvas.width / 2 / qualityFactor - shape.W / 2;
        shape.Y = canvas.height / 2 / qualityFactor - shape.H / 2;

        shape.cwObject = obj;
        ctx.scale(qualityFactor, qualityFactor);

        var diagC = {};
        diagC.objectTypesStyles = diagramTemplate.diagram.paletteEntries;
        diagC.json = {};
        diagC.json.diagram = {};
        diagC.json.diagram.Style = palette.Style;
        diagC.json.diagram.symbols = diagramTemplate.diagram.symbols;
        diagC.camera = {};
        diagC.camera.scale = 1;
        diagC.ctx = ctx;
        diagC.ctx.font = "10px sans-serif";
        diagC.CorporateModelerDiagramScale = 1;
        diagC.loop = 0;
        diagC.pictureGalleryLoader = new cwApi.CwPictureGalleryLoader.Loader(diagC);

        diagC.loadRegionExplosionWithRuleAndRefProp = function () {
          if (errors.explosionRegion !== true) {
            console.log("Explosion Region are not Supported Yet");
            errors.explosionRegion = true;
          }
        };
        diagC.getNavigationDiagramsForObject = function () {
          if (errors.navigationRegion !== true) {
            console.log("Navigation Region are not Supported Yet");
            errors.navigationRegion = true;
          }
        };
        diagC.getDiagramPopoutForShape = function () {};
        var shapeObj = new cwApi.Diagrams.CwDiagramShape(shape, palette, diagC);

        shapeObj.draw(ctx);
        let img = cwAPI.customLibs.utils.trimCanvas(canvas).toDataURL();
        return img;
      }
    }
  };

  var setLayoutToPercentHeight = function (elementHTML, percent) {
    // set height
    var titleReact = document.querySelector("#cw-top-bar").getBoundingClientRect();
    var topBarReact = document.querySelector(".page-top").getBoundingClientRect();
    var canvaHeight = ((window.innerHeight - titleReact.height - topBarReact.height) * percent) / 100;
    elementHTML.setAttribute("style", "height:" + canvaHeight + "px");
  };

  var getCustomLayoutConfiguration= function (configName) {
    if(cwAPI.cwConfigs.EnabledVersion.indexOf("v2022") !== -1) {
      return getCustomLayoutConfiguration_new(configName);
    } else {
      return getCustomLayoutConfiguration_old(configName);
    }
  };

  var getCustomLayoutConfiguration_new = function (configName) {
    let localConfiguration = localStorage.getItem(getConfigLocalStorageKey(0));
    //if value found in local storage
    if (localConfiguration) {
        try {
            cwApi.customLibs.utils.customLayoutConfiguration = JSON.parse(localConfiguration);
        } catch (e) {
            return null;
        }
    } else if (cwApi.customLibs.utils.customLayoutConfiguration === undefined) {
        try {
            //get configuration Json from API
            let tempJsonResult = getWorkflowJsonConfigFromApi();
            let parsedConfigJson = JSON.parse(cleanJSON(tempJsonResult.ConfigJson));
            cwApi.customLibs.utils.customLayoutConfiguration = parsedConfigJson;
            cwApi.customLibs.utils.configurationVersionNumber = tempJsonResult.ConfigVersionNumber;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    if (configName === undefined)
        return cwApi.customLibs.utils.customLayoutConfiguration;
    else
        return cwApi.customLibs.utils.customLayoutConfiguration[configName];
  };

  var cleanJSON = function (json) {
    let c = json.replaceAll('\\\\\\"', "#§#§#");
    c = c.replaceAll('\\"', '"');
    c = c.replaceAll("#§#§#", '\\"');
    return c;
  };

  
  var getCustomLayoutConfiguration_old = function (configName) {
    let localConfiguration = localStorage.getItem(cwApi.getSiteId() + "_" + cwApi.getDeployNumber() + "_coffeeMakerConfiguration");



    if (localConfiguration) {
      try {
        cwApi.customLibs.utils.customLayoutConfiguration = JSON.parse(localConfiguration);
      } catch (e) {
        return null;
      }
    } else if (cwApi.customLibs.utils.customLayoutConfiguration === undefined) {
      let view = cwAPI.ViewSchemaManager.getPageSchema("z_custom_layout_configuration");
      if (view && view.NodesByID[view.RootNodesId].ObjectTypeScriptName === "CCUSTOMLAYOUTCONFIGURATION") {
        let jsonFile = cwApi.getIndexViewDataUrl("z_custom_layout_configuration");
        var request = new XMLHttpRequest();
        request.open("GET", jsonFile, false); // `false` makes the request synchronous
        request.send(null);
        if (request.status === 200 && status != "Ko") {
          let jsonRep = JSON.parse(request.responseText);
          let obj = jsonRep[Object.keys(jsonRep)[0]];
          try {
            cwApi.customLibs.utils.customLayoutConfiguration = JSON.parse(cleanJSON(obj[0].properties.description));
          } catch (e) {
            return null;
          }
        } else return null;
      } else if (view) {
        try {
          cwApi.customLibs.utils.customLayoutConfiguration = JSON.parse(view.NodesByID[view.RootNodesId].LayoutOptions.CustomOptions.config);
        } catch (e) {
          return null;
        }
      } else {
        return null;
      }
    }

    if (configName === undefined) return cwApi.customLibs.utils.customLayoutConfiguration;
    else return cwApi.customLibs.utils.customLayoutConfiguration[configName];
  };

  var getWorkflowConfigVersionNumber = function () {
    try {
        //get configuration Json from API
        let configNumber = getWorkflowJsonConfigFromApi("ConfigVersionNumber");
        return configNumber;
    } catch (e) {
        return null;
    }
}

var getConfigLocalStorageKey = function (verNum) {
    if (!verNum) {
        verNum = getWorkflowConfigVersionNumber();
    }
    return cwApi.getSiteId() + "_" + verNum + "_coffeeMakerConfiguration";
}

var getWorkflowJsonConfigFromApi = function (prop) {
    //Sam
    let outputJson;
    let getJsonConfigApiUrl = cwApi.getLiveServerURL() + "AdvancedWorkflow/GetConfig";
    var result = $.ajax({
        url: getJsonConfigApiUrl,
        type: 'GET',
        async: false,
        dataType: 'json', // added data type
        success: function (res) {
            if (prop) {
                switch (prop) {
                    case "ConfigJson":
                        outputJson = JSON.parse(cleanJSON(res.result["ConfigJson"]));
                        break;
                    case "ConfigVersionNumber":
                        outputJson = res.result["ConfigVersionNumber"];
                        break;
                }
            }
            else
                outputJson = res.result;
        }
    });
    return outputJson;
};

var getDefaultWorkflowLayoutSchema = function (callback) {
    let url = cwApi.getLiveServerURL() + "AdvancedWorkflow/GetDefaultLayoutSchema";
    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function (res) {
            if (res.status === 'Ok' && res.result.Schema) {
                var schema = JSON.parse(res.result.Schema);
                return callback && callback(schema);
            }
  },
    });
};

var saveCustomLayoutConfiguration = function (configJsonForSave) {
    let outputJson;
    let dataForPost = { configJson: JSON.stringify(configJsonForSave) };
    let postJsonConfigApiUrl = cwApi.getLiveServerURL() + "AdvancedWorkflow/UpdateConfig";
    var result = $.ajax({
        url: postJsonConfigApiUrl,
        type: 'POST',
        data: dataForPost,
        dataType: 'json',
        async: false,
        success: function (res) {
            outputJson = res;
        }
    });
    return outputJson;
};

var removeLocalConfiguration = function () {
    var localKeys = []
    for (var i = 0, len = localStorage.length; i < len; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(cwApi.getSiteId() + "_") && key.endsWith("_coffeeMakerConfiguration")) {
            localKeys.push(key);
        }
    }

    for (var k = 0; k < localKeys.length; k++) {
        localStorage.removeItem(localKeys[k]);
    }
};


  var setupWebSocketForSocial = function (callback) {
    cwApi.CwWebSocketConnection = null;

    cwApi.CwAsyncLoader.load("signalR", function () {
      var h = $.connection.cwEvolveHub,
        dataServicesHub = $.connection.cwEvolveDataServices,
        $connection,
        mConnectionSlow,
        mReconnecting,
        mDisconnected,
        mStateChange;

      if (cwApi.isUndefined($.connection)) {
        return callback && callback(null);
      }
      if (cwApi.signalRSeverPath !== undefined) {
        $.connection.hub.url = cwApi.signalRSeverPath;
      }

      cwApi.CwDiagramEditorLoader.info("start initialization of the ws connection...");
      h.client.updateUsersCount = function (users) {
        cwApi.CwDiagramEditorLoader.info("updateUsersCount (cwEvolveHub)", users);
      };
      cwApi.isWebSocketConnected = false;

      cwApi.CwDataServicesApi = new cwApi.CwBoomerang(dataServicesHub, cwApi.getSiteId(), ["flatQuery"], false);
      cwApi.CwDataServicesApi.registerWebSockets();

      cwApi.pluginManager.execute("CwBone.RegisterWebSockets");

      mConnectionSlow = function () {
        cwApi.Log.Info("web socket connection is slow...");
      };
      mReconnecting = function () {
        if (!cwApi.isUndefinedOrNull(cwApi.cwEModeler.CwDiagramEditor)) {
          cwApi.cwEModeler.CwDiagramEditorHelperStatic.updateConnectionStatus(false);
        }
        cwApi.Log.Info("web socket connection try reconnecting...");
      };

      mDisconnected = function () {
        cwApi.Log.Info("web socket has been disconnected...");
      };

      mStateChange = function (change) {
        cwApi.Log.Info(cwApi.format("web socket has been changed to {0}...", change.newState));
        cwApi.isWebSocketConnected = change.newState === $.signalR.connectionState.connected;

        // Check if Diagram Editor module is loaded
        if (!cwApi.isUndefined(cwApi.cwEModeler.CwDiagramEditorHelperStatic)) {
          cwApi.cwEModeler.CwDiagramEditorHelperStatic.updateConnectionStatus(cwApi.isWebSocketConnected);
        }
      };

      // unbind the events, if the user log off / login
      $connection = $($.connection.hub);
      $connection.unbind("onConnectionSlow");
      $connection.unbind("onReconnecting");
      $connection.unbind("onDisconnect");
      $connection.unbind("onStateChanged");

      $.connection.hub.connectionSlow(mConnectionSlow);
      $.connection.hub.reconnecting(mReconnecting);
      $.connection.hub.disconnected(mDisconnected);
      $.connection.hub.stateChanged(mStateChange);

      $.connection.hub.start(cwApi.getWebSocketOptions()).done(function () {
        if (!cwApi.isUndefinedOrNull(cwApi.cwEModeler.CwDiagramEditor)) {
          cwApi.cwEModeler.CwDiagramEditorHelperStatic.updateConnectionStatus(true);
        }
        cwApi.CwDiagramEditorLoader.info("connection done");
        h.server.hello();
        cwApi.CwWebSocketConnection = true;
        return callback && callback(null);
      });
    });
  };

  var createPopOutFormultipleObjects = function (objects, popoutName) {
    var that, o, $div, $ul, i;
    if (objects.length === 0) return;
    cwApi.CwPopout.show(popoutName ? popoutName : cwApi.mm.getObjectType(objects[0].objectTypeScriptName).pluralName);
    cwApi.CwPopout.onClose(function () {
      cwApi.unfreeze();
    });

    let popOutName = cwApi.replaceSpecialCharacters(objects[0].objectTypeScriptName) + "_diagram_popout";
    let popoutExist = cwAPI.ViewSchemaManager.pageExists(popOutName);

    o = [];
    that = this;
    o.push('<form action="#" class="form-select">');
    o.push('<div class="cwDiagramExplosionMultipleChoice"><ul>');
    o.push("</ul></div>");
    o.push("</form>");
    $div = $(o.join(""));
    cwApi.CwPopout.setContent($div);

    function createDialog(obj) {
      var miniO = [],
        $li;
      miniO.push("<li>");
      if (cwApi.cwLayouts.CwLayout.prototype.getEnhancedDisplayItem) {
        let cds = popoutExist ? "<#" + popOutName + "#> {name}" : "{name}";
        if (obj.properties.hasOwnProperty("displayname")) cds = cds.replace("{name}", "{displayname}");
        miniO.push(cwApi.customLibs.utils.getCustomDisplayString(cds, obj));
        $li = $(miniO.join(""));
      } else {
        miniO.push("<div>", obj.name, "</div>", "</li>");
        $li = $(miniO.join(""));
        if (popoutExist) {
          $li.click(function () {
            cwApi.cwDiagramPopoutHelper.openDiagramPopout(obj, popOutName);
          });
        }
      }

      $ul.append($li);
    }

    $ul = $div.find("ul").first();
    for (i = 0; i < objects.length; i += 1) {
      createDialog(objects[i]);
    }
  };

  var cwFilter = function (objectTypeScriptName) {
    this.filters = [];
    this.objectTypeScriptName = objectTypeScriptName;
  };

  cwFilter.prototype.initWithString = function (configString) {
    this.filters = configString.split("#").map(function (fString) {
      let split = fString.split(":");
      return {
        Asset: split[0],
        Operator: split.length > 1 ? split[1] : ">",
        Value: split.length > 1 ? split[2] : 0,
      };
    });
  };

  cwFilter.prototype.init = function (filters) {
    this.filters = filters;
  };

  cwFilter.prototype.addFilter = function (filter) {
    this.filters.push(filters);
  };

  cwFilter.prototype.isMatching = function (item) {
    let isActionToDo = true;
    var self = this;
    if (item) {
      return this.filters.every(function (filter) {
        return self.matchFilter(item, filter);
      });
    }
  };

  cwFilter.prototype.matchFilter = function (item, filter) {
    let objPropertyValue, value;
    // contributor
    if (filter.Asset === "contrib") {
      return !cwApi.cwUser.isCurrentUserSocial();
    } else if (item.associations && item.associations.hasOwnProperty(filter.Asset)) {
      //associations
      objPropertyValue = item.associations[filter.Asset].length;
      value = filter.Value;
    } else if (item.properties.hasOwnProperty(filter.Asset) || item.iProperties[filter.Asset.replace("cwintersection_", "")]) {
      let iAsso =
        item.properties[filter.Asset] === undefined && item.iProperties[filter.Asset.replace("cwintersection_", "")] !== undefined ? true : false;

      filter.Asset = iAsso ? filter.Asset.replace("cwintersection_", "") : filter.Asset;
      objPropertyValue = iAsso ? item.iProperties[filter.Asset] : item.properties[filter.Asset];
      let propertyType = iAsso
        ? cwApi.mm.getProperty(item.iObjectTypeScriptName, filter.Asset)
        : cwApi.mm.getProperty(item.objectTypeScriptName ? item.objectTypeScriptName : this.objectTypeScriptName, filter.Asset);

      value = filter.Value;
      if (filter.Asset === "id") {
        // changing id to make usable like other property
        objPropertyValue = item.object_id;
      } else if (propertyType.type === "Boolean") {
        value = value === "true" || value === true ? true : false;
      } else if (propertyType.type === "Lookup") {
        if (iAsso) {
          objPropertyValue =
            item.iProperties[filter.Asset + "_id"] == undefined ? item.iProperties[filter.Asset] : item.iProperties[filter.Asset + "_id"];
        } else {
          objPropertyValue =
            item.properties[filter.Asset + "_id"] == undefined ? item.properties[filter.Asset] : item.properties[filter.Asset + "_id"];
        }
      } else if (propertyType.type === "Date") {
        objPropertyValue = new Date(iAsso ? item.iProperties[filter.Asset] : item.properties[filter.Asset]);
        objPropertyValue = objPropertyValue.getTime();
        let d = filter.Value;
        if (d.indexOf("{@currentDate}") !== -1 || d.indexOf("{@currentdate}") !== -1) {
          d = d.split("-");
          let dateOffset = 24 * 60 * 60 * 1000 * parseInt(d[1]);
          let today = new Date();
          value = today.getTime() - dateOffset;
        } else {
          d = new Date(d);
          value = d.getTime();
        }
      } else {
        objPropertyValue = iAsso ? item.iProperties[filter.Asset] : item.properties[filter.Asset];
      }
      if (value.replace && cwAPI.isLive()) {
        value = value.replace("@currentCwUserName", cwAPI.cwUser.getCurrentUserItem().name);
        value = value.replace("@currentCwUserId", cwAPI.cwUser.getCurrentUserItem().object_id);
      }
    } else return;

    switch (filter.Operator) {
      case "=":
        return objPropertyValue.toString() == value.toString();
      case "<":
        return objPropertyValue < value;
      case ">":
        return objPropertyValue > value;
      case "!=":
        return objPropertyValue.toString() != value.toString();
      case "In":
        return value.indexOf(objPropertyValue) !== -1;
      default:
        return false;
    }
  };

  var editObject = function (oldObject, newObject, reload, callback) {
    var changeset, sourceItem, targetItem;

    oldObject.displayNames = Object.keys(oldObject.properties).map(function (pScriptname) {
      return cwApi.mm.getProperty(oldObject.objectTypeScriptName, pScriptname).displayNames;
    });
    oldObject.associations = [];
    newObject.displayNames = Object.keys(oldObject.properties).map(function (pScriptname) {
      return cwApi.mm.getProperty(oldObject.objectTypeScriptName, pScriptname).displayNames;
    });
    newObject.associations = [];
    cwApi.pendingChanges.clear();
    changeset = new cwApi.CwPendingChangeset(oldObject.objectTypeScriptName, oldObject.object_id, oldObject.name, true, 1);
    changeset.compareAndAddChanges(oldObject, newObject);
    cwApi.pendingChanges.addChangeset(changeset);
    cwApi.pendingChanges.sendAsChangeRequest(
      undefined,
      function (response) {
        if (cwApi.statusIsKo(response)) {
          cwApi.notificationManager.addNotification($.i18n.prop("editmode_someOfTheChangesWereNotUpdated"), "error");
        } else {
          cwApi.notificationManager.addNotification($.i18n.prop("editmode_yourChangeHaveBeenSaved"));
          if (reload) window.location.hash = window.location.hash + "&reload=true";
        }
        callback(response);
      },
      function (error) {
        callback(error);
        cwApi.notificationManager.addNotification(error.status + " - " + error.responseText, "error");
      }
    );
  };

  var isObjectFavorite = function (objectTypeScriptName, object_id) {
    let favList = cwAPI.CwBookmarkManager.getFavouriteList();
    return (
      favList[objectTypeScriptName] &&
      favList[objectTypeScriptName].some(function (favObject) {
        return favObject.object_id === object_id;
      })
    );
  };

  var manageObjectFavoriteStatus = function (objectTypeScriptName, object_id, element, evt) {
    if (evt) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
    }
    if (isObjectFavorite(objectTypeScriptName, object_id)) {
      removeObjectAsFavorite(objectTypeScriptName, object_id, function () {
        if (element) element.className = element.className.replace("fa-heart", "fa-heart-o");
      });
    } else {
      addObjectAsFavorite(objectTypeScriptName, object_id, function () {
        if (element) element.className = element.className.replace("fa-heart-o", "fa-heart");
      });
    }
  };

  var addObjectAsFavorite = function (objectTypeScriptName, object_id, callback) {
    cwApi.CwPendingEventsManager.setEvent("FavouriteBtnClick");
    var sendData = {
      itemProperties: {},
      changedAssociations: [],
      SkipWorkflow: true,
    };
    cwApi.cwFavourite.cwFavourite.buildAssociationList(
      sendData.changedAssociations,
      cwApi.mmDefinition.ASSOCIATION_SCRIPTNAME_USERTOANYOBJECT,
      object_id,
      objectTypeScriptName,
      "",
      "added"
    );

    cwApi.cwEditProperties.UpdateSocialFeatures(
      sendData,
      cwApi.currentUser.ID,
      cwApi.mmDefinition.OBJECTTYPE_SCRIPTNAME_USER,
      function (updatedData) {
        if (updatedData.status === "Ko") {
          cwApi.notificationManager.addNotification(updatedData.error, "error");
          cwApi.CwPendingEventsManager.deleteEvent("AddFavouriteToObject");
        } else {
          cwApi.cwFavourite.cwFavourite.updateProperties(
            cwApi.mmDefinition.PROPERTYTYPE_SCRIPTNAME_FAVOURITE,
            true,
            updatedData.intersectionObjectProperties[0].intersectionObjectID,
            cwApi.mmDefinition.INTERSECTION_OBJECT_SCRIPTNAME_USERTOANYOBJECT,
            function (o) {
              cwApi.notificationManager.addNotification($.i18n.prop("notification_favoriteSet"));
              cwAPI.CwBookmarkManager.loadFavourites(callback);
            }
          );
        }
      }
    );
    cwApi.CwPendingEventsManager.deleteEvent("FavouriteBtnClick");
  };

  var removeObjectAsFavorite = function (objectTypeScriptName, object_id, callback) {
    let favList = cwAPI.CwBookmarkManager.getFavouriteList();
    return (
      favList[objectTypeScriptName] &&
      favList[objectTypeScriptName].some(function (favObject) {
        if (favObject.object_id === object_id) {
          cwApi.cwFavourite.cwFavourite.updateProperties(
            cwApi.mmDefinition.PROPERTYTYPE_SCRIPTNAME_FAVOURITE,
            false,
            favObject.iProperties.id,
            cwApi.mmDefinition.INTERSECTION_OBJECT_SCRIPTNAME_USERTOANYOBJECT,
            function (updatedData) {
              if (cwApi.statusIsKo(updatedData)) {
                cwApi.notificationManager.addNotification(updatedData.error, "error");
                cwApi.CwPendingEventsManager.deleteEvent("RemoveFavouriteFromObject");
              } else {
                cwApi.notificationManager.addNotification($.i18n.prop("notification_favoriteUnSet"));
                cwAPI.CwBookmarkManager.loadFavourites(callback);
              }
            }
          );
          return true;
        }
      })
    );
  };

  var getColorFromItemValue = function (item, propertyTypeScriptName) {
    let rColor = "#AAA";
    let CLCconfig = cwApi.customLibs.utils.getCustomLayoutConfiguration("property");
    let prop = cwApi.mm.getProperty(item.objectTypeScriptName, propertyTypeScriptName);
    let value = item.properties[propertyTypeScriptName];
    if (CLCconfig.hasOwnProperty(item.objectTypeScriptName) && CLCconfig[item.objectTypeScriptName].hasOwnProperty(propertyTypeScriptName)) {
      CLCconfig = CLCconfig[item.objectTypeScriptName][propertyTypeScriptName];
      if (prop.type === "Lookup") {
        if (CLCconfig.hasOwnProperty(item.properties[propertyTypeScriptName + "_id"])) {
          CLCconfig = CLCconfig[item.properties[propertyTypeScriptName + "_id"]];
        }
      } else {
        // number
        let selectedStep;
        CLCconfig.steps.forEach(function (step) {
          if (
            ([undefined, null, ""].indexOf(step.min) !== -1 && [undefined, null, ""].indexOf(step.max) !== -1) ||
            ([undefined, null, ""].indexOf(step.max) !== -1 && step.min < value) ||
            ([undefined, null, ""].indexOf(step.min) !== -1 && step.max > value) ||
            (step.min < value && step.max > value)
          ) {
            selectedStep = step;
          }
        });
        CLCconfig = selectedStep;
      }
    } else {
      let i = -1;
      if (item.properties[propertyTypeScriptName] == cwApi.cwConfigs.UndefinedValue)
        item.properties[propertyTypeScriptName] = $.i18n.prop("global_undefined");

      let o = CLCconfig.hardcoded.some(function (m) {
        i++;
        return m.value == item.properties[propertyTypeScriptName];
      });
      if (o) {
        CLCconfig = CLCconfig.hardcoded[i];
      }
    }
    if (CLCconfig && CLCconfig.iconColor) rColor = CLCconfig.iconColor;
    if (CLCconfig && CLCconfig.valueColor) rColor = CLCconfig.valueColor;

    return rColor;
  };

  function get_style_rule_value(selector, style) {
    var selector_compare = selector.toLowerCase();
    var selector_compare2 = selector_compare.substr(0, 1) === "." ? selector_compare.substr(1) : "." + selector_compare;

    for (var i = 0; i < document.styleSheets.length; i++) {
      var mysheet = document.styleSheets[i];
      var myrules = mysheet.cssRules ? mysheet.cssRules : mysheet.rules;

      for (var j = 0; j < myrules.length; j++) {
        if (myrules[j].selectorText) {
          var check = myrules[j].selectorText.toLowerCase();
          switch (check) {
            case selector_compare:
            case selector_compare2:
              return myrules[j].style[style];
          }
        }
      }
    }
  }

  var sort2Array = function (arrayToSort, arrayToMimicSort, reverse) {
    //1) combine the arrays:
    var list = [];
    for (var j = 0; j < arrayToSort.length; j++) {
      let r = arrayToMimicSort.map(function (a) {
        return a[j];
      });
      list.push({ sortProp: arrayToSort[j], r: r });
    }

    //2) sort:
    list.sort(function (a, b) {
      if (reverse) return b.sortProp < a.sortProp ? -1 : b.sortProp == a.sortProp ? 0 : 1;
      return a.sortProp < b.sortProp ? -1 : a.sortProp == b.sortProp ? 0 : 1;
    });

    //3) separate them back out:
    for (var k = 0; k < list.length; k++) {
      arrayToSort[k] = list[k].sortProp;
      arrayToMimicSort.forEach(function (a, i) {
        a[k] = list[k].r[i];
      });
    }
  };

  if (cwAPI.customFunction === undefined) cwAPI.customFunction = {};
  cwApi.customFunction.openDiagramPopoutWithID = function (id, popOutName, evt) {
    var obj = {};
    if (evt) {
      evt.preventDefault();
      evt.stopImmediatePropagation();
    }
    obj.object_id = id;
    cwAPI.cwDiagramPopoutHelper.openDiagramPopout(obj, popOutName);
  };

  cwAPI.customLibs.doActionForSingle.wordButton = function (mainObject) {
    let wordButtons = document.querySelectorAll(".wordDynamictemplate");
    loadWordTemplaterJs();
    wordButtons.forEach(function (wordButton) {
      let url = wordButton.getAttribute("url");
      addWordEvent(wordButton, mainObject, url);
    });
  };

  var loadWordTemplaterJs = function () {
    if (cwAPI.isDebugMode() === false) {
      function loadjscssfile(filename) {
        var fileref = document.createElement("script");
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", filename);
        if (typeof fileref != "undefined") document.getElementsByTagName("head")[0].appendChild(fileref);
      }
      loadjscssfile("/evolve/Common/modules/docxTemplater/docxTemplater.concat.js?" + cwApi.getDeployNumber());
    }
  };

  var blobToBase64 = function (blob, callback) {
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(",")[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var addWordEvent = function (wordButton, mainObject, url) {
    wordButton.addEventListener("click", function () {
      cwDocxTemplate.exportWord(mainObject, url + "?" + cwAPI.getRandomNumber(), null, {
        property: function (item, propertyScriptName) {
          let value = cwApi.cwPropertiesGroups.getDisplayValue(
            item.objectTypeScriptName,
            propertyScriptName,
            item.properties[propertyScriptName],
            item,
            "properties",
            false,
            true
          );
          value = cwApi.cwPropertiesGroups.getSpecialPropertyValue(propertyScriptName, value);
          return value;
        },
        getLink: function (item) {
          return { url: cwAPI.getSingleViewHash(cwAPI.replaceSpecialCharacters(item.objectTypeScriptName), item.name), label: item.name };
        },
        customDisplayString: function (item, cds) {
          let r = cwAPI.customLibs.utils.getCustomDisplayString(cds + "<##>", item, "", false, true);
          return '<meta charset="UTF-8"><body>' + r.replace('<a class="obj" >', "").replace("</a></a>", "</a>") + "</body>";
        },
        getAutomaticDiagram: function (lID, item, width) {
          return new Promise(function (resolve, reject) {
            var diagramViewer = cwAPI.customLibs.diagramViewerByNodeIDAndID[lID + "-" + item.object_id];
            diagramViewer.getImageFromCanvas(null, 5, null, true, function (diagramImage) {
              setTimeout(function () {
                diagramImage.canvas.toBlob(function (blob) {
                  diagramImage.remove();
                  blobToBase64(blob, function (base64) {
                    resolve({
                      width: width,
                      height: (width * diagramViewer.camera.diagramSize.h) / diagramViewer.camera.diagramSize.w,
                      data: base64,
                      extension: ".png",
                    });
                  });
                }, "image/png");
              }, 500);
            });
          });
        },
        getNetwork: function (nodeID, width, height) {
          cwAPI.customLibs.utils.getImgFromNetwork(nodeID, width, height);
        },
        getDiagram: function (diagram, width) {
          return new Promise(function (resolve, reject) {
            var diagramViewer = cwAPI.customLibs.diagramViewerByNodeIDAndID[diagram.nodeID + "-" + diagram.object_id];
            diagramViewer.getImageFromCanvas(null, 5, null, true, function (diagramImage) {
              setTimeout(function () {
                diagramImage.canvas.toBlob(function (blob) {
                  diagramImage.remove();
                  blobToBase64(blob, function (base64) {
                    resolve({
                      width: width,
                      height: (width * diagramViewer.camera.diagramSize.h) / diagramViewer.camera.diagramSize.w,
                      data: base64,
                      extension: ".png",
                    });
                  });
                }, "image/png");
              }, 500);
            });
          });
        },
      });
    });
  };

  var getImgFromNetwork = function (nodeID, width, height) {
    width = width ?? 2;
    height = height ?? 3;
    let canva = document.querySelector("#cwLayoutNetwork" + nodeID + " canvas");
    var networkUI;
    cwAPI.appliedLayouts.some(function (l) {
      if (l.nodeID === nodeID) {
        networkUI = l.networkUI;
        return true;
      }
    });

    networkUI.fit();
    var container = document.getElementById("cwLayoutNetworkCanva" + nodeID);
    var oldheight = container.offsetHeight;
    var scale = networkUI.getScale(); // change size of the canva to have element in good resolution

    let newWidth = container.offsetWidth / scale;
    let newHeight = (container.offsetWidth * 3) / (scale * 2);

    container.style.width = newWidth.toString() + "px";
    container.style.height = newHeight.toString() + "px";
    networkUI.background = true;
    networkUI.redraw();

    return new Promise(function (resolve, reject) {
      cwApi.customLibs.utils.getBlobFromCanva(canva, function (blob) {
        blobToBase64(blob, function (base64) {
          resolve({
            width: width,
            height: height,
            data: base64,
            extension: ".png",
          });
          container.style.height = oldheight + "px";
          container.style.width = "";
          networkUI.background = false;
          networkUI.redraw();
          networkUI.fit();
        });
      });
    });
  };

  var getImgFromDiagram = function (id) {
    return new Promise(async (resolve) => {
      var diagramViewer = cwAPI.customLibs.diagramViewerByNodeIDAndID[id];
      diagramViewer.getImageFromCanvas(null, 5, null, true, async function (diagramImage) {
        await cwApi.customLibs.utils.timeout(500);
        diagramImage.canvas.toBlob(function (blob) {
          diagramImage.remove();
          blobToBase64(blob, function (base64) {
            resolve({
              width: diagramViewer.camera.diagramSize.w,
              height: diagramViewer.camera.diagramSize.h,
              data: base64,
              extension: ".png",
            });
          });
        }, "image/png");
      });
    });
  };

  var shareWorkflow = function (objectName, objectId, objectTypeScriptName, message, rolesToShareWith, subject, actionLink, callback) {
    let shareRequest = new cwApi.workflow.dataClasses.shareRequest.CwShareRequest(objectId, objectTypeScriptName, message);
    var someDate = new Date();
    let m = someDate.getMonth() + 1;
    m = m < 10 ? "0" + m : "" + m;
    let d = someDate.getDate() < 10 ? "0" + someDate.getDate() : "" + someDate.getDate();
    someDate = d + "/" + m + "/" + someDate.getFullYear();
    shareRequest.sendRequest(objectName, someDate, rolesToShareWith, subject, actionLink, function (response, loginLoaded) {
      function complete() {
        callback();
      }

      if (cwApi.statusIsKo(response)) {
        if (!loginLoaded) {
          if (response.code === cwAPI.cwConfigs.ErrorCodes.NoRecipientsWorkflow) {
            cwApi.notificationManager.addNotification($.i18n.prop("workflow_thereAreNoValidRecipientsForThisRequest"), "error");
          } else {
            cwApi.notificationManager.addNotification($.i18n.prop("workflow_somethingWentWrongWhileSharingThisPage"), "error");
            complete();
          }
        }
      } else {
        cwApi.notificationManager.addNotification($.i18n.prop("workflow_thisPageHasBeenSharedWithUsersInTheSelectedRoles"));
        complete();
      }
    });
  };

  var sendRequestToCwFileHandling = function (request, parameters, callback) {
    var xmlhttp = new XMLHttpRequest();
    var self = this;
    //replace second argument with the path to your Secret Server webservices
    xmlhttp.open("POST", window.location.origin + "/evolve/CWFileHandling/CwFileHandling.asmx", true);

    //create the SOAP request
    //replace username, password (and org + domain, if necessary) with the appropriate info
    var strRequest =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
      "<soap12:Body>" +
      "<" +
      request +
      ' xmlns="http://HawkeyeQ.org/">';
    parameters.forEach(function (p) {
      var v = p.value;
      if (v && v.indexOf) {
        v = v.replaceAll(/&/, "&amp;");
        v = v.replaceAll(/</, "&lt;");
        v = v.replaceAll(/>/, "&gt;");
      }
      strRequest += "<" + p.key + ">" + v + "</" + p.key + ">";
    });

    strRequest += "</" + request + ">" + "</soap12:Body>" + "</soap12:Envelope>";

    //specify request headers
    xmlhttp.setRequestHeader("Content-Type", "application/soap+xml; charset=utf-8");

    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4) {
        cwAPI.siteLoadingPageFinish();
        callback(xmlhttp.responseText);
      }
    };

    cwAPI.siteLoadingPageStart();
    //clean the SOAP request

    //send the SOAP request
    xmlhttp.send(strRequest);
  };

  var associateUserToCwWorkflowRole = function (cwUserIDs, cwRoleId, callback) {
    let jsonObject = {
      objectTypeScriptname: "cw_role",
      object_id: cwRoleId,
      iProperties: {},
      properties: {
        name: "WorkFlow Role",
      },
      associations: {
        cw_roletocw_role_to_cw_usertocw_user: cwUserIDs.map(function (cwUserID) {
          return {
            object_id: cwUserID,
          };
        }),
      },
    };
    cwAPI.customLibs.utils.sendRequestToCwFileHandling(
      "CwCreateUpdateObjectConnId",
      [
        { key: "Connection", value: "" },
        { key: "Username", value: cwAPI.cwUser.getCurrentUserItem().name },
        { key: "Password", value: "" },
        { key: "ConnectionId", value: $.connection.cwEvolveDiagramEditorHub.connection.id },
        { key: "ModelScriptName", value: cwApi.cwConfigs.ModelFilename },
        { key: "ObjectJsonStr", value: angular.toJson(jsonObject) },
      ],
      function (response) {
        let id = response.replace("\r\n", "").match(/<ObjectId>(.*)<\/ObjectId>/)[1];
        if (id == "0") {
          cwAPI.notificationManager.addError(
            "An error occur during the assignement of the roles : \n" + response.replace("\r\n", "").match(/<Message>(.*)<\/Message>/)[1]
          );
          return;
        }
        callback();
      }
    );
  };

  var sendIndexContext = function (displayId, contextIds) {
    if (cwAPI.getCurrentView()) {
      return cwAPI.appliedLayouts.some(function (apl) {
        if (apl.LayoutName === "cw-grid") {
          return apl.config.columns.some(function (col) {
            return col.displays.some(function (display) {
              if (display.uuid && display.uuid.toString() === displayId && display.giveIndexContext) {
                var newEvent = document.createEvent("Event");
                newEvent.data = contextIds;
                newEvent.initEvent("indexContext from " + displayId, true, true);
                document.querySelector(".homePage_main").dispatchEvent(newEvent);
                return true;
              }
            });
          });
        }
      });
    } else {
      cwAPI.customLibs.utils.getCustomLayoutConfiguration("homePage").columns.some(function (col) {
        return col.displays.some(function (display) {
          if (display.uuid && display.uuid.toString() === displayId && display.giveIndexContext) {
            var newEvent = document.createEvent("Event");
            newEvent.data = contextIds;
            newEvent.initEvent("indexContext from " + displayId, true, true);
            document.querySelector(".homePage_main").dispatchEvent(newEvent);
            return true;
          }
        });
      });
    }
  };

  var sendSingleContext = function (displayId, scriptname, id, label) {
    if (cwAPI.getCurrentView()) {
      return cwAPI.appliedLayouts.some(function (apl) {
        if (apl.LayoutName === "cw-grid") {
          return apl.config.columns.some(function (col) {
            return col.displays.some(function (display) {
              if (display.uuid && display.uuid.toString() === displayId && display.giveSingleContext) {
                var newEvent = document.createEvent("Event");
                newEvent.id = id;
                newEvent.scriptname = scriptname;
                newEvent.label = label;
                newEvent.initEvent("singleContext from " + displayId, true, true);
                document.querySelector(".homePage_main").dispatchEvent(newEvent);
                return true;
              }
            });
          });
        }
      });
    } else {
      cwAPI.customLibs.utils.getCustomLayoutConfiguration("homePage").columns.some(function (col) {
        return col.displays.some(function (display) {
          if (display.uuid && display.uuid.toString() === displayId && display.giveSingleContext) {
            var newEvent = document.createEvent("Event");
            newEvent.id = id;
            newEvent.scriptname = scriptname;
            newEvent.label = label;
            newEvent.initEvent("singleContext from " + displayId, true, true);
            document.querySelector(".homePage_main").dispatchEvent(newEvent);
            return true;
          }
        });
      });
    }
  };

  var clickSingleContext = function (event, scriptname, id, label) {
    var homeDisplay = event.target.closest(".homePage_display");
    if (!homeDisplay || !sendSingleContext(homeDisplay.id, scriptname, id, label)) {
      window.location.hash = cwApi.getSingleViewHash(cwApi.replaceSpecialCharacters(scriptname), id);
    }
  };

  var timeout = function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /********************************************************************************
    Configs : add trigger for single page
    *********************************************************************************/
  if (cwAPI.customLibs === undefined) {
    cwAPI.customLibs = {};
  }
  if (cwAPI.customLibs.doActionForSingle === undefined) {
    cwAPI.customLibs.doActionForSingle = {};
  }
  if (cwAPI.customLibs.doActionForIndex === undefined) {
    cwAPI.customLibs.doActionForIndex = {};
  }

  if (cwAPI.customLibs.doActionForAll === undefined) {
    cwAPI.customLibs.doActionForAll = {};
  }

  if (cwAPI.customLibs.utils === undefined) {
    cwAPI.customLibs.utils = {};
  }
  if (cwAPI.customLibs.utils.glossary === undefined) {
    cwAPI.customLibs.utils.glossary = {};
  }

  cwAPI.customLibs.utils.version = 2.5;
  cwAPI.customLibs.utils.timeout = timeout;
  cwAPI.customLibs.utils.layoutsByNodeId = {};
  cwAPI.customLibs.utils.getItemDisplayString = getItemDisplayString;
  cwAPI.customLibs.utils.manageHiddenNodes = manageHiddenNodes;
  cwAPI.customLibs.utils.manageContextualNodes = manageContextualNodes;
  cwAPI.customLibs.utils.manageFilterByBaseObjectNodes = manageFilterByBaseObjectNodes;

  cwAPI.customLibs.utils.editObject = editObject;

  cwAPI.customLibs.utils.cleanEmptyNodes = cleanEmptyNodes;
  cwAPI.customLibs.utils.copyToClipboard = copyToClipboard;
  cwAPI.customLibs.utils.copyToImageClipboard = copyToImageClipboard;
  cwAPI.customLibs.utils.copyCanvasToClipboard = copyCanvasToClipboard;
  cwAPI.customLibs.utils.getBlobFromCanva = getBlobFromCanva;
  cwAPI.customLibs.utils.getImgFromDiagram = getImgFromDiagram;
  cwAPI.customLibs.utils.getImgFromNetwork = getImgFromNetwork;

  cwAPI.customLibs.utils.openDiagramPopoutWithID = cwApi.customFunction.openDiagramPopoutWithID;

  cwAPI.customLibs.utils.parseNode = parseNode;
  cwAPI.customLibs.utils.trimCanvas = trimCanvas;

  cwAPI.customLibs.utils.shapeToImage = shapeToImage;
  cwAPI.customLibs.utils.getPaletteShape = getPaletteShape;
  cwAPI.customLibs.utils.setLayoutToPercentHeight = setLayoutToPercentHeight;
  cwAPI.customLibs.utils.getCustomDisplayString = getCustomDisplayString;
  cwAPI.customLibs.utils.getCustomDisplayStringWithOutHTML = getCustomDisplayStringWithOutHTML;
  cwAPI.customLibs.utils.getColorFromItemValue = getColorFromItemValue;
  cwAPI.customLibs.utils.getCssStyle = get_style_rule_value;

  cwAPI.customLibs.utils.getWorkflowConfigVersionNumber = getWorkflowConfigVersionNumber;
  cwAPI.customLibs.utils.getCustomLayoutConfiguration = getCustomLayoutConfiguration;
  cwAPI.customLibs.utils.getConfigLocalStorageKey = getConfigLocalStorageKey;
  cwAPI.customLibs.utils.removeLocalConfiguration = removeLocalConfiguration;
  cwAPI.customLibs.utils.saveCustomLayoutConfiguration = saveCustomLayoutConfiguration;
  cwAPI.customLibs.utils.getDefaultWorkflowLayoutSchema = getDefaultWorkflowLayoutSchema;

  cwAPI.customLibs.utils.setupWebSocketForSocial = setupWebSocketForSocial;
  cwAPI.customLibs.utils.cwFilter = cwFilter;
  cwAPI.customLibs.utils.createPopOutFormultipleObjects = createPopOutFormultipleObjects;
  cwAPI.customLibs.utils.isObjectFavorite = isObjectFavorite;
  cwAPI.customLibs.utils.addObjectAsFavorite = addObjectAsFavorite;
  cwAPI.customLibs.utils.removeObjectAsFavorite = removeObjectAsFavorite;
  cwAPI.customLibs.utils.manageObjectFavoriteStatus = manageObjectFavoriteStatus;

  cwAPI.customLibs.utils.sort2Array = sort2Array;
  cwAPI.customLibs.utils.addWordEvent = addWordEvent;
  cwAPI.customLibs.utils.loadWordTemplaterJs = loadWordTemplaterJs;

  cwAPI.customLibs.utils.shareWorkflow = shareWorkflow;
  cwAPI.customLibs.utils.sendRequestToCwFileHandling = sendRequestToCwFileHandling;
  cwAPI.customLibs.utils.associateUserToCwWorkflowRole = associateUserToCwWorkflowRole;

  cwApi.customLibs.utils.sendIndexContext = sendIndexContext;
  cwAPI.customLibs.utils.sendSingleContext = sendSingleContext;
  cwAPI.customLibs.utils.clickSingleContext = clickSingleContext;

  cwAPI.customLibs.doActionForAll.printButton = enablePrintButton;
})(cwAPI, jQuery);
