django-ebagis-ui
================

This is a django app implementing a user interface for the
ebagis Basin Analysis GIS server-side data management platform.


Installation
------------

Install the development version via pip:

    pip install https://github.com/PSU-CSAR/django-ebagis-ui/zipball/master 

And then add it to your Django `INSTALLED_APPS`:

    INSTALLED_APPS = (
        # ...
        'ebagis_ui',
    )


Note that django-ebagis-ui requires django-ebagis.


Updating
--------

Updating the version of ebagis in the repo requires cloning the git repo and
and running some git commands locally. If you don't have a local copy, first,

    git clone git@github.com:PSU-CSAR/django-ebagis-ui.git

Then you'll need to add the remotes for the ebagis_ui repo:

    git remote add ebagis_ui git@github.com:PSU-CSAR/ebagis-ui.git

Next, fetch the ebagis_ui branch and create a branch with it set as the upstream:

    git fetch ebagis_ui
    git checkout -b ebagis_ui ebagis_ui/deploy

You can now merge the ebagis_ui subtree into master:

    git checkout master
    git read-tree --prefix=ebagis_ui/static/ebagis_ui -u ebagis_ui




