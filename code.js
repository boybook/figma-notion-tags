// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.
// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (see documentation).
// This shows the HTML page in "ui.html".
figma.showUI(__html__);
figma.ui.resize(288, 600);
figma.clientStorage.getAsync("figma-notion.access").then(data => {
    if (data && data.figma_token && data.notion_token && data.notion_database) {
        const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
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
    }
    else {
        figma.ui.postMessage({
            type: "init"
        });
    }
});
// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = msg => {
    if (msg.type === 'init') {
        figma.clientStorage.setAsync("figma-notion.access", {
            figma_token: msg.figma_token,
            notion_token: msg.notion_token,
            notion_database: msg.notion_database
        });
    }
    else if (msg.type === 'close') {
        figma.closePlugin();
    }
    else if (msg.type === 'clearLocalStorage') {
        figma.clientStorage.deleteAsync("figma-notion.access").then(re => figma.closePlugin());
    }
    else if (msg.type === 'notify') {
        figma.notify(msg.msg, msg.options);
    }
    else if (msg.type === 'node-push') {
        const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
        if (node) {
            node.setRelaunchData({
                'edit': 'Node Name: ' + msg.name
            });
        }
    }
    else if (msg.type === 'node-delete') {
        const node = figma.currentPage.selection.length > 0 ? getPageRootNode(figma.currentPage.selection[0]) : figma.currentPage;
        if (node) {
            node.setRelaunchData({});
        }
    }
};
figma.on("selectionchange", () => {
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
});
function isRootFrame(node) {
    return node.parent.type == "PAGE";
}
function getPageRootNode(node) {
    while (node.parent.type !== "PAGE") {
        node = node.parent;
    }
    return node;
}
