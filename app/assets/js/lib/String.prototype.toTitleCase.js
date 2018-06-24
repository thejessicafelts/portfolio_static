// via http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript

// String.prototype.toTitleCase = function() {
//   var i, j, str, lowers, uppers;
//   str = this.replace(/([^\W_]+[^\s-]*) */g, function(txt) {
//     return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
//   });

//   // Certain minor words should be left lowercase unless 
//   // they are the first or last words in the string
//   lowers = ['A', 'An', 'The', 'And', 'But', 'Or', 'For', 'Nor', 'As', 'At', 
//   'By', 'For', 'From', 'In', 'Into', 'Near', 'Of', 'On', 'Onto', 'To', 'With'];
//   for (i = 0, j = lowers.length; i < j; i++)
//     str = str.replace(new RegExp('\\s' + lowers[i] + '\\s', 'g'), 
//       function(txt) {
//         return txt.toLowerCase();
//       });

//   // Certain words such as initialisms or acronyms should be left uppercase
//   uppers = ['Id', 'Tv'];
//   for (i = 0, j = uppers.length; i < j; i++)
//     str = str.replace(new RegExp('\\b' + uppers[i] + '\\b', 'g'), 
//       uppers[i].toUpperCase());

//   return str;
// }
function toTitleCase(e){var t=/^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|vs?\.?|via)$/i;return e.replace(/([^\W_]+[^\s-]*) */g,function(e,n,r,i){return r>0&&r+n.length!==i.length&&n.search(t)>-1&&i.charAt(r-2)!==":"&&i.charAt(r-1).search(/[^\s-]/)<0?e.toLowerCase():n.substr(1).search(/[A-Z]|\../)>-1?e:e.charAt(0).toUpperCase()+e.substr(1)})};

// console.log( toTitleCase( "ignores mixed case words like iTunes, and allows AT&A and website.com/address etc..." ) );