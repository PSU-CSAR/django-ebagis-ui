# django-ebagis-ui

## Setting up a development environment

As most dependencies are included in the repository, setting up a development environment requires only installing global dependencies and cloning the repository.

1. Install the LTS node.js release for your platform using your preferred method ([download the package](https://nodejs.org/en/), or on mac use [`brew`](http://brew.sh/).)

2. Once node is install npm, the node package manager,
   will be available for use on the system.
   Use npm to install the remaining dependencies bower,
   gulp, and typings:

   `npm install -g bower gulp typings browser-sync connect-history-api-fallback`

   Note that I currently use the following versions of these packages:

   - bower@1.7.9
   - gulp@3.9.1
   - typings@0.8.1 (note that I plan to migrate to >=1.0)
   - broswer-sync@2.12.12
   - connect-history-api-fallback@1.2.0

3. Clone this repository after `cd`'ing to your desired working directory:
   `git clone git@github.com:PSU-CSAR/django-ebagis-ui.git`

At this point you should be set to start developing.


## Developing for ebagis

The source for the project is in `public/`,
with the angular source in `public/src` specifically.
For most development tasks, you should only need to work in the `public/` directory.

`gulp` is the build tool used for this project.
Running `gulp` will build the project,
start a local webserver running on port 3000
(configurable in the gulp file),
then watch the source for changes.
This single command provides everything a developer might need for almost all tasks,
aside from pushing changes to the deploy branch.

Once you have made some changes and are ready to deploy them,
obviously commit the source changes using git,
then deploy the code using `gulp deploy`.
At this point, the deploy command will build the project,
then it will take the contents of `public/` and push them
to the `deploy` branch on `origin` upstream.

Any deployed changes will need to be pulled on down on
any projects using them as no commit hooks are currently
in place to allow automated updating of those resources.
