using IDP.DMS.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace IDP.DMS.Api.Controllers
{
    [ApiController]
    [Route("api/ui")]
    [Tags("IDP.DMS UI")]
    public class UiController : ControllerBase
    {
        private readonly UiDesignService _uiDesignService;

        public UiController(UiDesignService uiDesignService)
        {
            _uiDesignService = uiDesignService;
        }

        [HttpGet("summary")]
        public IActionResult GetSummary()
        {
            return Ok(_uiDesignService.GetSummary());
        }

        [HttpGet("menu")]
        public IActionResult GetMenu()
        {
            return Ok(_uiDesignService.GetMenu());
        }

        [HttpGet("features")]
        public IActionResult SearchFeatures(
            [FromQuery] string? phase,
            [FromQuery] string? actor,
            [FromQuery] string? kind,
            [FromQuery] string? query)
        {
            return Ok(_uiDesignService.SearchFeatures(phase, actor, kind, query));
        }

        [HttpGet("features/{id}")]
        public IActionResult GetFeature(string id)
        {
            var feature = _uiDesignService.GetFeature(id);
            return feature is null ? NotFound() : Ok(feature);
        }

        [HttpGet("features/{id}/screen")]
        public IActionResult GetFeatureScreen(string id)
        {
            var screen = _uiDesignService.GetScreen(id);
            return screen is null ? NotFound() : Ok(screen);
        }
    }
}
