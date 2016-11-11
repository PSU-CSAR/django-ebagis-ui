django-ebagis-ui
================

This is a django app implementing a user interface for the
ebagis Basin Analysis GIS server-side data management platform.


Installation
------------

Install the development version via pip:

    pip install https://github.com/PSU-CSAR/ebagis-ui/zipball/deploy 

Add it to your Django `INSTALLED_APPS`:

    INSTALLED_APPS = (
        # ...
        'ebagis_ui',
    )

And then collect the static assets:

    python manage.py collectstatic

Note that django-ebagis-ui requires django-ebagis.


Updating
--------

If revisions have been made to the ebagis-ui code, the changes can be deployed
into this package using the `gulp deploy` command. This will build the deploy
files, templatize the index.html for django, copy them into this source tree,
and then push everything to the deploy branch on github.

To install the update, simply just use the install commands above, but remember
to tell `pip` to upgrade:

    pip install -U https://github.com/PSU-CSAR/ebagis-ui/zipball/deploy

Don't forget to re-collect the static assets to pull in any changes from the packaage.

