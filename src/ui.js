import Vue from "vue";
import './ui.css';

// 注册一个全局自定义指令 `v-focus`
Vue.directive('focus', {
    // 当被绑定的元素插入到 DOM 中时……
    inserted: function (el) {
        // 聚焦元素
        el.focus()
    }
});

const app = new Vue({
    el: '#app',
    data: {
        figma_node: undefined,
        tokens_inited: false,
        tokens_setting_show: true,
        tokens_setting_intro: undefined,
        tokens: {
            figma_token: '',
            notion_token: '',
            notion_database: '',
        },
        file: undefined,
        full_tags: {},
        loading: 'Loading...',
        node: {
            notion_id: undefined,
            id: undefined,
            name: '',
            tags: {},
            need_reload_tags: false
        }
    },
    methods: {
        saveTokens: async function (event) {
            parent.postMessage({
                pluginMessage: {
                    type: 'init',
                    figma_token: this.tokens.figma_token,
                    notion_token: this.tokens.notion_token,
                    notion_database: this.tokens.notion_database
                }
            }, '*');
            this.loading = 'Checking tokens...';
            this.tokens_setting_show = false;
            try {
                await loadTags();
            } catch (e) {
                notify('The token is not correct', { error: true });
                this.loading = undefined;
                this.tokens_setting_show = true;
                this.tokens_setting_intro = 'Something wrong: [' + e.status + "] " + e.statusText;
                return;
            }
            this.tokens_inited = true;
            this.tokens_setting_show = false;
            this.tokens_setting_intro = undefined;
            if (this.figma_node) {
                await loadNode(this.file, this.figma_node);
            }
        },
        testClearLocalStorage: function (event) {
            parent.postMessage({
                pluginMessage: {
                    type: 'clearLocalStorage'
                }
            }, '*');
        },
        pushNode: async function (event) {
            this.loading = "Saving...";
            const tags = tree2Tag(app.node.tags);
            const result0 = await fetch('https://notion.boybook.top/node/push/' + app.file + "/" + app.node.id, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'figma_token': app.tokens.figma_token,
                    'notion_token': app.tokens.notion_token,
                    'notion_database': app.tokens.notion_database
                },
                body: JSON.stringify({
                    name: app.node.name,
                    tags: tags,
                })
            });
            if (!result0.ok) {
                app.tokens_setting_show = true;
                app.tokens_setting_intro = 'Something wrong: [' + result0.status + "] " + result0.statusText;
                return;
            }
            const result = result0.json();
            parent.postMessage({
                pluginMessage: {
                    type: 'node-push',
                    name: app.node.name
                }
            }, '*');
            if (result.result.length > 0) {
                this.node.notion_id = result.result[0].id;
                this.node.notion_url = result.result[0].url;
            }
            if (this.node.need_reload_tags) {
                this.loading = "Loading Tags...";
                await loadTags();
                await loadNode(this.file, this.figma_node);
            }
            this.loading = undefined;
            notify('Push success! [' + this.node.name + "]");
            parent.postMessage({
                pluginMessage: {
                    type: 'loading-finish'
                }
            }, '*');
        },
        deleteNode: async function (event) {
            this.loading = "Deleting...";
            const result = await fetch('https://notion.boybook.top/node/delete/' + app.file + "/" + app.node.id, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'figma_token': app.tokens.figma_token,
                    'notion_token': app.tokens.notion_token,
                    'notion_database': app.tokens.notion_database
                }
            }).then(d => d.json());
            parent.postMessage({
                pluginMessage: {
                    type: 'node-delete'
                }
            }, '*');
            this.node.notion_id = undefined;
            this.node.notion_url = undefined;
            notify('Delete success!');
            await loadNode(this.file, this.figma_node);
            parent.postMessage({
                pluginMessage: {
                    type: 'loading-finish'
                }
            }, '*');
        },
        refresh: async function (event) {
            if (!this.loading) {
                this.loading = "Loading Tags...";
                await loadTags();
                await loadNode(this.file, this.figma_node);
            }
        },
        toggleType: function (tagType) {
            tagType.open = tagType.adding || !tagType.open;
        },
        toggleAdding: function (tagType) {
            tagType.adding = !tagType.adding;
        },
        addTag: function (tagType) {
            if (tagType.addingText.length > 0) {
                const subs = tagType.addingText.replaceAll(' ', '').split('/', 2);
                const tag = {
                    check: true,
                    color: 'default',
                    id: '',
                    name: tagType.addingText
                }
                if (subs.length > 1) {
                    if (!tagType.tags[subs[0]]) {
                        tagType.tags[subs[0]] = [];
                    }
                    tagType.tags[subs[0]].unshift(tag);
                } else {
                    tagType.tags[''].unshift(tag);
                }
                tagType.adding = false;
                tagType.addingText = '';
                this.node.need_reload_tags = true;
            }
        }
    }
});

const loadTags = async () => {
    const response = await fetch('https://notion.boybook.top/tags', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'figma_token': app.tokens.figma_token,
            'notion_token': app.tokens.notion_token,
            'notion_database': app.tokens.notion_database
        }
    });
    if (!response.ok) {
        throw {
            status: response.status,
            statusText: response.statusText
        };
    }
    const result = await response.json();
    app.full_tags = result.result;
}

const loadNode = async (file, node) => {
    if (!node) return;
    app.file = file;
    app.node.id = node.id;
    app.node.need_reload_tags = false;
    app.loading = "Loading Node...";
    const data = await fetch('https://notion.boybook.top/node/get/' + file + "/" + node.id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'figma_token': app.tokens.figma_token,
            'notion_token': app.tokens.notion_token,
            'notion_database': app.tokens.notion_database
        }
    }).then(d => d.json())

    if (data.result.length > 0) {
        app.node.notion_id = data.result[0].id;
        app.node.notion_url = data.result[0].url;
        app.node.name = data.result[0].name;
        if (app.full_tags) {
            app.node.tags = tags2Tree(app.full_tags, data.result[0]['tags']);
        }
    } else { // 在 Notion 没有找到 Node
        app.node.notion_id = undefined;
        app.node.notoin_url = undefined;
        app.node.name = node.name;
        app.node.tags = tags2Tree(app.full_tags, {});
    }
    app.loading = undefined;
}

let tagsArrayDemo = [
    {
        type: "上线",
        open: true,
        adding: false,
        addingText: '',
        tags: {
            '': [

            ],
            xxx: [
                {
                    check: true,
                    color: 'tag.color',
                    id: 'tag.id',
                    name: 'tag.name'
                },
                {
                    check: false,
                    color: 'tag.color',
                    id: 'tag.id',
                    name: 'tag.name'
                }
            ]
        }
    }
]

/**
 * @param full_tags Tags config
 * @param node_tags Tags data from Notion API
 * @returns {*[]} Tags data for UI
 */
const tags2Tree = (full_tags, node_tags) => {
    const tagsArray = [];
    for (let tagType in full_tags) {
        // type
        const tags = {
            '': []  // 把默认组放在最前面
        };
        for (let tag of full_tags[tagType]) {
            const tagNameSubs = tag.name.replaceAll(' ', '').split('/', 2);
            const childTag = tagNameSubs.length > 1 ? tagNameSubs[0] : '';
            if (!tags[childTag]) {
                tags[childTag] = [];
            }
            const treeTag = {
                check: false,
                color: tag.color,
                id: tag.id,
                name: tag.name
            };
            tags[childTag].push(treeTag);
        }
        for (let tagKey in tags['']) {
            if (tags[tags[''][tagKey].name]) {
                tags[tags[''][tagKey].name].unshift(tags[''][tagKey]);
                tags[''].splice(tagKey, 1);
            }
        }
        // tagType
        let entry = {
            type: tagType,
            open: true,
            adding: false,
            addingText: '',
            tags: tags
        };
        if (Object.keys(node_tags).length > 0) {
            for (let childTag in entry.tags) {
                for (let tagIndex in entry.tags[childTag]) {
                    for (let tagVaild of node_tags[tagType]) {
                        if (entry.tags[childTag][tagIndex].name === tagVaild.name) {
                            entry.tags[childTag][tagIndex].check = true;
                            break;
                        }
                    }
                }
            }
        }
        tagsArray.push(entry);
    }
    return tagsArray;
}

const tree2Tag = (tree) => {
    const tags = {};
    for (let tagEntry of tree) {
        const array = [];
        for (let childType in tagEntry.tags) {
            for (let tag of tagEntry.tags[childType]) {
                if (tag.check) {
                    array.push(tag.name);
                }
            }
        }
        tags[tagEntry.type] = array;
    }
    return tags;
}

// Handle figma messages
onmessage = async (event) => {
    const message = event.data.pluginMessage;
    if (message.tokens) {
        app.tokens = message.tokens;
        app.tokens_inited = true;
    }
    if (message.type === 'init') {
        app.figma_node = message.node;
        app.tokens_setting_show = true;
    } else if (message.type === 'normal') {
        app.figma_node = message.node;
        app.tokens_setting_show = false;
        try {
            await loadTags();
        } catch (e) {
            app.tokens_setting_show = true;
            app.tokens_setting_intro = 'Something wrong: [' + e.status + "] " + e.statusText;
            return;
        }
        await loadNode(message.file, message.node);
    } else if (message.type === 'selectionchange') {
        if (app.loading) return; // Loading 时不接收selectionchange事件，但是会在loading完成后，主动请求刷新
        if (!app.tokens_inited) return;
        if (!app.figma_node || message.node.id !== app.figma_node.id) {
            app.figma_node = message.node;
            await loadNode(message.file, message.node);
            parent.postMessage({
                pluginMessage: {
                    type: 'loading-finish'
                }
            }, '*');
        }
    }
}

const notify = (msg, options) => {
    parent.postMessage({
        pluginMessage: {
            type: 'notify',
            msg: msg,
            options: options
        }
    }, '*');
}