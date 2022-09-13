module.exports = function ModifyStructure(html) {
    // 分块, 把h3和h2开头的切成数组
    const htmlList = html.replace(/<h3/g, '$*(<h3').replace(/<h2/g, '$*(<h2').split('$*(');
    // div套上 .card 类名
    return htmlList
        .map(item => {
            if (item.indexOf('<h3') !== -1) {
                return `<div class="card card-3">${item}</div>`
            } else if (item.indexOf('<h2') !== -1) {
                return `<div class="card card-2">${item}</div>`
            }
            return item;
        })
        .join('');
}