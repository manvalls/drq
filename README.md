
# Dynamic require

This script allows you to make node's `require` calls in the browser, without having to make a bundle. Useful for developing purposes, as it eliminates the need of a build script, saving you some time. For production, the optimal solution is still to include a bundling script into your build procedure, since, as you surely now, the less requests, the better.

Using drq is as simple as including it on an html page:

```html
<script src="drq.js"></script>
```

You can then proceed to load your program:

```html
<script>

require('scripts/myprogram.js');

</script>
```

If you only use `require` to load files, with this you're probably good to go. However, most likely you'll want to `require` modules, previously installed in the folder with `npm install`. You can do this, and it'll work, but it'll be painfully slow. The reason: the script has to check a lot of places - just take a look at the require algorithm. But worry not, there's a solution for this too!

Historically, modules were installed in a global directory: your `$NODE_PATH`. This is now considered bad practise - I personally don't know why - , however there are other options like `npm link` which come close to this approach. Why am I telling you this? Well, if all your modules (and its dependencies) are located in a single folder, now the script only has to look in one place. What a difference! From all these places:

```
http://yourdomain.com/frontpage/scripts/menu/node_modules/dependency/node_modules/
http://yourdomain.com/frontpage/scripts/menu/node_modules/
http://yourdomain.com/frontpage/scripts/node_modules/
http://yourdomain.com/frontpage/node_modules/
http://yourdomain.com/node_modules/
```

To just:

```
http://yourdomain.com/modules/
```

If you've got a big project, trust me, you'll see the difference. Now, how do you tell drq where to look? Couldn't be more simple:

```javascript
require.core.push('http://yourdomain.com/modules/');
```

As you may imagine, `require.core` is an array which holds a list of "probable locations" for your modules. This list is checked before any other place, so if your module is located there it will be found quickier than if it's in some lost `node_modules` directory. And that's all, enjoy developing without having to wait for some building script to end.

If this little piece of code interests you, please feel free to help with it! PRs and issues are welcomed.
