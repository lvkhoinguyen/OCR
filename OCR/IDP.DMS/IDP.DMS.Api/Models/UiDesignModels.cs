using System.Text.Json.Serialization;

namespace IDP.DMS.Api.Models;

public sealed class UiDesignData
{
    [JsonPropertyName("features")]
    public List<FeatureDto> Features { get; set; } = [];
}

public sealed class FeatureDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("section")]
    public string Section { get; set; } = string.Empty;

    [JsonPropertyName("actor")]
    public string Actor { get; set; } = string.Empty;

    [JsonPropertyName("subActor")]
    public string SubActor { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("actions")]
    public List<ActionDto> Actions { get; set; } = [];

    [JsonPropertyName("phase")]
    public string Phase { get; set; } = string.Empty;
}

public sealed class ActionDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("actor")]
    public string Actor { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public List<string> Kind { get; set; } = [];
}

public sealed record FunctionMenuGroup(string Title, IReadOnlyList<string> Items);

public sealed record FieldSpec(string Name, string Type = "text", bool Required = true, string? Hint = null);

public sealed record ScreenSpec(
    string FeatureId,
    string LayoutKind,
    IReadOnlyList<FieldSpec> Fields,
    IReadOnlyList<string> Rules);
