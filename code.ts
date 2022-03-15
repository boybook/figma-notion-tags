figma.showUI(__html__);
figma.ui.resize(288, 600);

(async () => {
  const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
  const tokens = await figma.clientStorage.getAsync("figma-notion.access");
  const cached_tag_types = await figma.clientStorage.getAsync("figma-notion.tag-types");
  console.log(tokens);
  if (tokens && tokens.figma_token && tokens.notion_token && tokens.notion_database) {
    figma.ui.postMessage({
      type: "normal",
      tokens: tokens,
      cached_tag_types: cached_tag_types,
      file: figma.fileKey,
      node: {
        frame: node.type !== 'PAGE',
        id: node.id,
        name: node.name,
      }
    });
  } else {
    figma.ui.postMessage({
      type: "init",
      file: figma.fileKey,
      node: {
        frame: node.type !== 'PAGE',
        id: node.id,
        name: node.name,
      }
    });
  }
})();

setInterval(() => {
  for (let el of figma.currentPage.selection) {
    const tileNodeId = figma.currentPage.getPluginData(el.id);
    if (tileNodeId) {
      const tileNode = figma.getNodeById(tileNodeId);
      if (tileNode && (tileNode.type === 'GROUP' || tileNode.type === 'FRAME')) {
        tileNode.x = el.x;
        tileNode.y = el.y - 38;
      }
    }
  }
}, 50);

const tagColors = {
  default: {
    background: { r: 227/255, g: 226/255, b: 224/255 },
    color: { r: 50/255, g: 48/255, b: 44/255 }
  },
  gray: {
    background: { r: 227/255, g: 226/255, b: 224/255 },
    color: { r: 50/255, g: 48/255, b: 44/255 }
  },
  brown: {
    background: { r: 238/255, g: 224/255, b: 218/255 },
    color: { r: 68/255, g: 42/255, b: 30/255 }
  },
  orange: {
    background: { r: 250/255, g: 222/255, b: 201/255 },
    color: { r: 73/255, g: 41/255, b: 14/255 }
  },
  yellow: {
    background: { r: 253/255, g: 236/255, b: 200/255 },
    color: { r: 64/255, g: 44/255, b: 27/255 }
  },
  green: {
    background: { r: 219/255, g: 237/255, b: 219/255 },
    color: { r: 28/255, g: 56/255, b: 41/255 }
  },
  blue: {
    background: { r: 211/255, g: 229/255, b: 239/255 },
    color: { r: 24/255, g: 51/255, b: 71/255 }
  },
  purple: {
    background: { r: 232/255, g: 222/255, b: 238/255 },
    color: { r: 65/255, g: 36/255, b: 84/255 }
  },
  pink: {
    background: { r: 245/255, g: 224/255, b: 233/255 },
    color: { r: 76/255, g: 35/255, b: 55/255 }
  },
  red: {
    background: { r: 255/255, g: 226/255, b: 221/255 },
    color: { r: 93/255, g: 23/255, b: 21/255 }
  }
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {
  switch (msg.type) {
    case 'init': {
      figma.clientStorage.setAsync("figma-notion.access", {
        figma_token: msg.figma_token,
        notion_token: msg.notion_token,
        notion_database: msg.notion_database,
        oss: msg.oss
      });
      break;
    }
    case 'close': {
      figma.closePlugin();
      break;
    }
    case 'clearLocalStorage': {
      figma.clientStorage.deleteAsync("figma-notion.access").then(re => figma.closePlugin());
      break;
    }
    case 'notify': {
      figma.notify(msg.msg, msg.options);
      break;
    }
    case 'node-push-oss': {
      const node: BaseNode = figma.getNodeById(msg.node.id);
      if (node && node.type !== 'DOCUMENT') {
        node.exportAsync({
          format: "PNG",
          constraint: {
            type: 'SCALE',
            value: 1
          }
        }).then(result => {
          figma.ui.postMessage({
            type: "push-export",
            image: result,
            node: msg.node,
            data: msg.data
          });
        });
      } else {
        console.error("Can't found the node " + msg.node);
      }
      break;
    }
    case 'node-push-suc': {
      const node: BaseNode = figma.getNodeById(msg.node.id);
      if (node && isEmbedNodeLike(node)) {
        node.setRelaunchData({
          'edit': msg.node.name,
        });
        console.log(msg.node);

        const page = getPageNode(node);

        const tileNodeId = page.getPluginData(msg.node.id);
        if (tileNodeId) {
          figma.getNodeById(tileNodeId)?.remove();
        }

        figma.loadFontAsync({ family: "PingFang SC", style: "Semibold" }).then(() => {
          //const tagFrames = [];
          const root = figma.createFrame();
          root.x = node.x;
          root.y = node.y - 38;
          // @ts-ignore
          root.name = Object.values(msg.node.tags).flatMap(type => type.tags).flatMap(child => Object.values(child).flat()).filter(t => t.check).map(t => t.name).join();
          root.fills = [];
          root.layoutMode = 'HORIZONTAL';
          root.layoutAlign = 'INHERIT';
          root.layoutGrow = 0;
          root.primaryAxisAlignItems = 'MIN';
          root.primaryAxisSizingMode = 'AUTO';
          root.counterAxisSizingMode = 'AUTO';
          root.itemSpacing = 8;
          // @ts-ignore
          Object.values(msg.node.tags).flatMap(type => type.tags).flatMap(child => Object.values(child).flat()).filter(t => t.check).forEach(tag => {
            const frame = figma.createFrame();
            // frame.x = node.x;
            // frame.y = node.y - 40;
            frame.name = tag['name'];
            const text = figma.createText();
            text.fontName = {
              family: "PingFang SC",
              style: "Semibold"
            };
            text.lineHeight = { value: 14, unit: 'PIXELS' };
            text.fontSize = 12;
            text.characters = tag['name'];
            text.fills = [{
              type: "SOLID",
              color: tagColors[tag['color']] ? tagColors[tag['color']].color : tagColors.default.color,
            }];
            text.hyperlink = {
              type: "URL",
              value: msg.node.notion_url
            };
            frame.appendChild(text);
            frame.layoutMode = "HORIZONTAL";
            frame.primaryAxisSizingMode = "AUTO";
            frame.counterAxisSizingMode = "AUTO";
            frame.paddingTop = 4;
            frame.paddingBottom = 4;
            frame.paddingLeft = 8;
            frame.paddingRight = 8;
            frame.cornerRadius = 4;
            frame.fills = [{
              type: "SOLID",
              color: tagColors[tag['color']] ? tagColors[tag['color']].background : tagColors.default.background,
            }];
            frame.strokes = [{
              type: "SOLID",
              color: { r: 0, g: 0, b: 0},
              opacity: 0.05
            }];
            root.appendChild(frame);
          });
          const group = figma.group([root], page);
          group.name = root.name;
          page.appendChild(group);
          page.setPluginData(msg.node.id, group.id);
        }).catch(e => {
          figma.notify("Font family not found!", { error: true });
          console.log(e);
        });
      }
      break;
    }
    case 'node-delete': {
      const node: BaseNode = figma.getNodeById(msg.node.id);
      if (node) {
        node.setRelaunchData({});
        const page = getPageNode(node);
        const tileNodeId = page.getPluginData(msg.node.id);
        if (tileNodeId) {
          figma.getNodeById(tileNodeId)?.remove();
        }
      }
      break;
    }
    case 'loading-finish': {
      selectionChange();
      break;
    }
    case 'save-tags-type-cache': {
      figma.clientStorage.setAsync("figma-notion.tag-types", msg['tags']).then();
      break;
    }
  }
};

function test(node) {
  node.layoutGrow = 1;
}

figma.on("selectionchange", () => {
  selectionChange();
});

figma.on("currentpagechange", () => {
  selectionChange();
});

function selectionChange() {
  const file = figma.fileKey;
  const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
  figma.ui.postMessage({
    type: "selectionchange",
    file: file,
    node: {
      frame: node.type !== 'PAGE',
      id: node.id,
      name: node.name
    }
  });
}

function isRootFrame(node: BaseNode): node is FrameNode | ComponentNode | InstanceNode {
  return node.parent.type == "PAGE";
}

function getPageRootNode(node: BaseNode): SceneNode {
  while (node.parent.type !== "PAGE") {
    node = node.parent;
  }
  return <SceneNode> node;
}

function getPageNode(node: BaseNode): PageNode {
  while (node.type !== "PAGE") {
    node = node.parent;
  }
  return <PageNode> node;
}

function isEmbedNodeLike(node: BaseNode): node is EmbedNode {
  return true;
}