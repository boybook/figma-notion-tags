figma.showUI(__html__);
figma.ui.resize(288, 600);

figma.clientStorage.getAsync("figma-notion.access").then(data => {
  const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
  if (data && data.figma_token && data.notion_token && data.notion_database) {
    figma.ui.postMessage({
      type: "normal",
      tokens: data,
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
});

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
      const node: BaseNode = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
      if (node) {
        node.setRelaunchData({
          'edit': msg.name,
        });
      }
      break;
    }
    case 'node-delete': {
      const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
      if (node) {
        node.setRelaunchData({});
      }
      break;
    }
    case 'loading-finish': {
      selectionChange();
      break;
    }
  }
};

figma.on("selectionchange", () => {
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

function getPageRootNode(node: BaseNode): BaseNode {
  while (node.parent.type !== "PAGE") {
    node = node.parent;
  }
  return node;
}