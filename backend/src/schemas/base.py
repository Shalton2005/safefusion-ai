"""
Shared Pydantic base configuration for SafeFusion AI schemas.

All domain schemas inherit from :class:`AppBaseModel` to guarantee a
consistent set of model-config options across the entire codebase.
"""

from pydantic import BaseModel, ConfigDict


class AppBaseModel(BaseModel):
    """Base Pydantic model with shared configuration.

    Configuration:
        from_attributes: Enables reading field values from ORM model
            instances via ``model_validate(orm_obj)``.
        populate_by_name: Allows populating fields by their Python name
            when an alias is also defined.
        str_strip_whitespace: Automatically strips leading/trailing
            whitespace from all string fields.
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )
