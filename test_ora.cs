using System;
using Oracle.ManagedDataAccess.Client;
using System.IO;

class Program
{
    static void Main()
    {
        try {
            var root = @"d:\Hacom\New folder\OCR\IDP.DMS";
            var descriptorPath = Path.Combine(root, "cnn_ora.txt");
            var descriptor = File.ReadAllText(descriptorPath).Trim();
            var cs = $"User Id=dummyerp;Password=dummyerp;Data Source={descriptor};";
            Console.WriteLine("Connection string: " + cs);
            using var connection = new OracleConnection(cs);
            connection.Open();
            Console.WriteLine("Connected to Oracle successfully!");
        } catch (Exception ex) {
            Console.WriteLine("Oracle Error: " + ex.Message);
        }
    }
}
