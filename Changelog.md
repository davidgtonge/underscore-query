# 2.0
    - (**Breaking**) Made compound and subqueries align with the mongodb API ([#19](https://github.com/davidgtonge/underscore-query/issues/19), [#16](https://github.com/davidgtonge/underscore-query/issues/16), [#17](https://github.com/davidgtonge/underscore-query/issues/17), [#10](https://github.com/davidgtonge/underscore-query/issues/10))
    - (**Breaking**) Removed ES5 underscore shim. An `lodash` or `underscore` instance now must be passed to `underscore-query`.
    - (Change) Functions as query properties are now dynamically evaluated ([#22](https://github.com/davidgtonge/underscore-query/pull/22))
    - (Change) Added support for querying properties of items in an array ([#21](https://github.com/davidgtonge/underscore-query/pull/21))
    - (Fix) Fixed an issue where the provided getter would sometimes be overwritten if `q.getter` is assigned ([`16bf75`](https://github.com/davidgtonge/underscore-query/commit/16bf7529e20b886d717ba1e979db52dd313ea1bd))
    - (Fix) Added support for Lodash@4
    - (Fix) Null is no longer evaluated as 0 in numerical comparisions ([#23](https://github.com/davidgtonge/underscore-query/issues/23))

